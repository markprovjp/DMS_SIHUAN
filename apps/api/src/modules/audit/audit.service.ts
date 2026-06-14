import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

export interface AuditInput {
  userId?: string | null;
  action: string;
  details: string;
  ipAddress?: string | null;
}

/** Ghi log nhật ký hệ thống.
 *  Wrap trong try/catch để lỗi audit không bao giờ làm vỡ request chính. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private prisma: PrismaService) {}

  async log(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId ?? null,
          action: input.action,
          details: input.details,
          ipAddress: input.ipAddress ?? null,
        },
      });
    } catch (e) {
      this.logger.error(
        `Failed to write audit log [${input.action}]: ${(e as Error).message}`,
      );
    }
  }
}
