import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma.service";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { getJwtExpiresIn, getJwtSecret } from "../../common/config";
import { AuditService } from "../audit/audit.service";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface TokenPair {
  access_token: string;
  /** Refresh token opaque string — gửi về client 1 lần, server chỉ lưu hash. */
  refresh_token: string;
  /** Internal DB id, used to link rotated token chains. Not returned by controllers. */
  refreshTokenId: string;
  expires_in: number;
  user: { id: string; email: string; role: string };
}

interface RefreshTokenJwtPayload {
  sub: string;
  /** jti = RefreshToken.id, server dùng để lookup DB record. */
  jti: string;
  /** family — session chain id, dùng để revoke chain khi reuse. */
  family: string;
  /** Legacy JWT claim kept only for backward-compatible token parsing. */
  h: string;
  /** Loại token, để phân biệt với access token cùng secret. */
  typ: "refresh";
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private audit: AuditService,
  ) {}

  /** Sinh access + refresh token pair. DB chỉ lưu hash của refresh opaque token. */
  async issueTokenPair(
    userId: string,
    email: string,
    role: string,
    opts: { family?: string; userAgent?: string; ipAddress?: string } = {},
  ): Promise<TokenPair> {
    const family = opts.family ?? crypto.randomUUID();
    const jti = crypto.randomUUID();

    const accessPayload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: getJwtExpiresIn(),
    });
    const accessTtl = this.parseTtlToSeconds(getJwtExpiresIn());

    // Sinh refresh token dạng OPAQUE — 48 bytes base64url.
    const refreshPlain = crypto.randomBytes(48).toString("base64url");
    const opaqueHash = this.sha256(refreshPlain);

    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        tokenHash: opaqueHash,
        family,
        expiresAt,
        userAgent: opts.userAgent ?? null,
        ipAddress: opts.ipAddress ?? null,
      },
    });

    return {
      access_token: accessToken,
      // Client lưu PLAIN refresh token (KHÔNG phải JWT). Mỗi lần refresh gửi plain.
      // Server verify bằng cách hash plain rồi lookup tokenHash trong DB.
      refresh_token: refreshPlain,
      refreshTokenId: jti,
      expires_in: accessTtl,
      user: { id: userId, email, role },
    };
  }

  /** Login: cấp token pair mới. */
  async login(
    email: string,
    pass: string,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Thông tin đăng nhập không hợp lệ");
    }
    const isValid = await bcrypt.compare(pass, user.password);
    if (!isValid) {
      throw new UnauthorizedException("Thông tin đăng nhập không hợp lệ");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueTokenPair(user.id, user.email, user.role, {
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });
  }

  /** Refresh: rotate + reuse detection.
   *  Client gửi PLAIN refresh token (không phải JWT). Server:
   *    1. hash plain → opaqueHash
   *    2. Tìm record theo opaqueHash
   *    3. Nếu revoked → reuse → revoke family
   *    4. Nếu expired → fail
   *    5. Nếu OK → rotate: issue mới, revoke cũ
   *
   *  Hỗ trợ cả 2 dạng input: PLAIN opaque (preferred) hoặc JWT (backward-compat).
   */
  async refresh(
    refreshInput: string,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<TokenPair> {
    if (!refreshInput || typeof refreshInput !== "string") {
      throw new UnauthorizedException("Thiếu refresh token");
    }

    // Nếu input trông giống JWT (3 phần ngăn bởi dấu chấm), unwrap signature
    // để so sánh với hash trong claim — backward-compat với client cũ.
    // Tốt nhất client gửi plain opaque token.
    const opaquePlain = this.unwrapRefreshInput(refreshInput);

    const opaqueHash = this.sha256(opaquePlain);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: opaqueHash },
      include: { user: true },
    });

    if (!record) {
      // Có thể là JWT cũ (legacy) — try verify as JWT và lookup qua jti
      if (this.looksLikeJwt(refreshInput)) {
        return this.refreshFromLegacyJwt(refreshInput, meta);
      }
      throw new UnauthorizedException("Refresh token không hợp lệ");
    }

    if (record.revokedAt) {
      // REUSE DETECTION — token đã revoke bị dùng lại → huỷ cả family
      this.logger.warn(
        `Reuse detected for token in family=${record.family}, revoking family`,
      );
      await this.revokeFamily(record.family);
      throw new UnauthorizedException("Phiên đăng nhập đã bị thu hồi");
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token đã hết hạn");
    }
    if (!record.user.isActive) {
      throw new UnauthorizedException("Tài khoản đã bị vô hiệu");
    }

    // ROTATE
    const newPair = await this.issueTokenPair(
      record.userId,
      record.user.email,
      record.user.role,
      {
        family: record.family,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    );
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedBy: newPair.refreshTokenId },
    });
    return newPair;
  }

  /** Xử lý refresh token legacy (JWT) — verify signature + jti lookup + rotate. */
  private async refreshFromLegacyJwt(
    refreshJwt: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    let payload: RefreshTokenJwtPayload;
    try {
      payload = this.jwtService.verify(refreshJwt, {
        secret: getJwtSecret(),
      }) as RefreshTokenJwtPayload;
    } catch {
      throw new UnauthorizedException("Refresh token không hợp lệ");
    }
    if (payload.typ !== "refresh") {
      throw new UnauthorizedException("Token không đúng loại");
    }
    const record = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });
    if (!record) {
      throw new UnauthorizedException("Refresh token không tồn tại");
    }
    if (record.revokedAt) {
      this.logger.warn(
        `Reuse detected (legacy jwt) for family=${record.family}, revoking family`,
      );
      await this.revokeFamily(record.family);
      throw new UnauthorizedException("Phiên đăng nhập đã bị thu hồi");
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token đã hết hạn");
    }
    if (!record.user.isActive) {
      throw new UnauthorizedException("Tài khoản đã bị vô hiệu");
    }
    const newPair = await this.issueTokenPair(
      record.userId,
      record.user.email,
      record.user.role,
      {
        family: record.family,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    );
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), replacedBy: newPair.refreshTokenId },
    });
    return newPair;
  }

  /** Logout: revoke tất cả session của user hiện tại. */
  async logout(
    refreshInput: string | undefined,
    userId: string,
  ): Promise<void> {
    if (refreshInput) {
      const opaquePlain = this.unwrapRefreshInput(refreshInput);
      const opaqueHash = this.sha256(opaquePlain);
      const record = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: opaqueHash },
      });
      if (record) {
        await this.revokeFamily(record.family);
        return;
      }
      // Legacy JWT
      if (this.looksLikeJwt(refreshInput)) {
        try {
          const payload = this.jwtService.verify(refreshInput, {
            secret: getJwtSecret(),
          }) as RefreshTokenJwtPayload;
          if (payload.family) {
            await this.revokeFamily(payload.family);
            return;
          }
        } catch {
          // ignore
        }
      }
    }
    // Fallback: revoke hết của user
    await this.revokeAllForUser(userId);
  }

  async validateUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, isActive: true },
    });
  }

  // ---------- helpers ----------

  private async revokeFamily(family: string) {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private sha256(s: string): string {
    return crypto.createHash("sha256").update(s).digest("hex");
  }

  /** Input có thể là plain opaque token (48 bytes base64url) hoặc JWT.
   *  Nếu là JWT (3 phần ngăn bởi "."), wrap trong base64 để so sánh hash
   *  mà không lộ JWT trong DB. Hiện tại: chấp nhận plain opaque, từ chối JWT
   *  ở unwrap (vì đã có refreshFromLegacyJwt xử lý trước đó). */
  private unwrapRefreshInput(input: string): string {
    if (this.looksLikeJwt(input)) {
      // Nếu là JWT, không thể derive plain opaque từ JWT (1-way).
      // Trả về chính nó để lookup thất bại, controller sẽ fallback sang legacy path.
      return `__jwt__:${input}`;
    }
    return input;
  }

  private looksLikeJwt(s: string): boolean {
    const parts = s.split(".");
    return parts.length === 3 && parts.every((p) => p.length > 0);
  }

  private parseTtlToSeconds(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl);
    if (!m) return 900;
    const n = parseInt(m[1], 10);
    switch (m[2]) {
      case "s":
        return n;
      case "m":
        return n * 60;
      case "h":
        return n * 3600;
      case "d":
        return n * 86400;
      default:
        return 900;
    }
  }
}
