import {
  Controller,
  Get,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../../common/roles.guard";
import { Role } from "@prisma/client";
import { AuditQueryDto } from "../../common/dto";

@Controller("audit")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  /** Server-side paginated audit logs.
   *  Default: page 1, pageSize 50. Max pageSize 200. */
  @Get()
  async getLogs(
    @Query() q: AuditQueryDto,
    @Query("page", new DefaultValuePipe("1"), ParseIntPipe) page = 1,
    @Query("pageSize", new DefaultValuePipe("50"), ParseIntPipe) pageSize = 50,
  ) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(200, Math.max(1, pageSize));

    const where: any = {};
    if (q.action) {
      where.action = { contains: q.action, mode: "insensitive" };
    }
    if (q.userId) {
      where.userId = q.userId;
    }
    if (q.startDate || q.endDate) {
      where.createdAt = {};
      if (q.startDate) where.createdAt.gte = new Date(q.startDate);
      if (q.endDate) {
        const end = new Date(q.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (safePage - 1) * safeSize,
        take: safeSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }
}
