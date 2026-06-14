import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response, Request as ExpressRequest } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuditService } from "../audit/audit.service";
import { LoginDto, RefreshDto } from "../../common/dto";

const REFRESH_COOKIE = "dms_refresh";
const REFRESH_COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const IS_PROD = process.env.NODE_ENV === "production";

const cookieOpts = () => ({
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: REFRESH_COOKIE_TTL_MS,
});

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private audit: AuditService,
  ) {}

  /** Login — cấp access token (body) + refresh opaque (cookie httpOnly). */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const meta = {
        userAgent: req?.headers?.["user-agent"],
        ipAddress: req?.ip,
      };
      const result = await this.authService.login(
        body.email,
        body.password,
        meta,
      );
      // Set refresh opaque token vào httpOnly cookie
      res.cookie(REFRESH_COOKIE, result.refresh_token, cookieOpts());
      await this.audit.log({
        action: "LOGIN_SUCCESS",
        details: `email=${body.email}`,
        ipAddress: req?.ip,
        userId: result.user?.id,
      });
      return {
        access_token: result.access_token,
        expires_in: result.expires_in,
        user: result.user,
      };
    } catch (e) {
      await this.audit.log({
        action: "LOGIN_FAILED",
        details: `email=${body.email} reason=${(e as Error).message}`,
        ipAddress: req?.ip,
      });
      throw e;
    }
  }

  /** Refresh — rotate. Đọc refresh từ cookie (ưu tiên) hoặc body (fallback). */
  @Post("refresh")
  async refresh(
    @Body() body: RefreshDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = (req as any).cookies?.[REFRESH_COOKIE] as
      | string
      | undefined;
    const bodyToken = body?.refresh_token;
    const refreshInput = cookieToken || bodyToken;
    if (!refreshInput) {
      throw new UnauthorizedException(
        "Không tìm thấy refresh token (cookie hoặc body)",
      );
    }
    const result = await this.authService.refresh(refreshInput, {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    // Set refresh token mới (rotate) vào cookie
    res.cookie(REFRESH_COOKIE, result.refresh_token, cookieOpts());
    return {
      access_token: result.access_token,
      expires_in: result.expires_in,
      user: result.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  async logout(
    @Request() req: any,
    @Req() expressReq: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshInput = (expressReq as any).cookies?.[REFRESH_COOKIE];
    await this.authService.logout(refreshInput, req.user?.id);
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    await this.audit.log({
      action: "LOGOUT",
      details: `user=${req.user?.id ?? "-"}`,
      userId: req.user?.id,
      ipAddress: expressReq?.ip,
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getProfile(@Request() req: any) {
    return req.user;
  }
}
