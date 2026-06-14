import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { SettingsService } from "../settings/settings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../../common/roles.guard";
import { Role } from "@prisma/client";

const IS_PROD = process.env.NODE_ENV === "production";

interface HealthCheckResult {
  name: string;
  status: "ok" | "fail" | "skip";
  /** Latency in ms (only for ok/fail). */
  latencyMs?: number;
  /** Configured flag (only for ok when applicable). */
  configured?: boolean;
  /** Error message — MASKED in production. */
  error?: string;
}

@Controller("health")
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  /** Liveness probe — PUBLIC. Chỉ trả "ok" nếu process còn sống.
   *  Không phụ thuộc DB/Redis/AI/Mobiwork — Kubernetes-style liveness. */
  @Get("live")
  live() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  /** Readiness probe — ADMIN/MANAGER only. Chi tiết dependencies.
   *  Kubernetes-style readiness: 503 nếu 1 dep critical fail. */
  @Get("ready")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async ready() {
    const checks: HealthCheckResult[] = await Promise.all([
      this.checkDb(),
      this.checkAi(),
      this.checkMobiwork(),
    ]);
    const criticalFail = checks.some(
      (c) => c.status === "fail" && c.name !== "redis",
    );
    const result = {
      status: criticalFail ? "fail" : "ok",
      timestamp: new Date().toISOString(),
      checks,
    };
    if (criticalFail) {
      throw new HttpException(result, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }

  // Legacy aggregate — kept for backward-compat, ADMIN only
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async aggregate() {
    return this.ready();
  }

  // Detailed per-dep (ADMIN only)
  @Get("db")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async db() {
    const r = await this.checkDb();
    if (r.status === "fail")
      throw new HttpException(r, HttpStatus.SERVICE_UNAVAILABLE);
    return r;
  }

  @Get("ai")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async ai() {
    const r = await this.checkAi();
    if (r.status === "fail")
      throw new HttpException(r, HttpStatus.SERVICE_UNAVAILABLE);
    return r;
  }

  @Get("mobiwork")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async mobiwork() {
    const r = await this.checkMobiwork();
    if (r.status === "fail")
      throw new HttpException(r, HttpStatus.SERVICE_UNAVAILABLE);
    return r;
  }

  // ---- helpers ----

  private async checkDb(): Promise<HealthCheckResult> {
    const t0 = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { name: "database", status: "ok", latencyMs: Date.now() - t0 };
    } catch (e) {
      return {
        name: "database",
        status: "fail",
        latencyMs: Date.now() - t0,
        error: this.maskError(e),
      };
    }
  }

  private async checkAi(): Promise<HealthCheckResult> {
    const t0 = Date.now();
    try {
      const s = await this.settings
        .getAll()
        .catch(() => ({}) as Record<string, string>);
      const envKey = process.env.AI_API_KEY || s["aiApiKey"];
      const envBase = process.env.AI_BASE_URL || s["aiBaseUrl"];
      if (envKey && envBase) {
        return {
          name: "ai",
          status: "ok",
          latencyMs: Date.now() - t0,
          configured: true,
        };
      }
      return { name: "ai", status: "skip", latencyMs: Date.now() - t0 };
    } catch (e) {
      return {
        name: "ai",
        status: "fail",
        latencyMs: Date.now() - t0,
        error: this.maskError(e),
      };
    }
  }

  private async checkMobiwork(): Promise<HealthCheckResult> {
    if (!process.env.MOBIWORK_USER_ID || !process.env.MOBIWORK_TOKEN) {
      return { name: "mobiwork", status: "skip" };
    }
    return { name: "mobiwork", status: "ok" };
  }

  /** Chỉ trả message lỗi chi tiết ở dev. Production chỉ trả "unhealthy". */
  private maskError(e: unknown): string {
    if (!IS_PROD) {
      return e instanceof Error ? e.message : String(e);
    }
    return "unhealthy";
  }
}
