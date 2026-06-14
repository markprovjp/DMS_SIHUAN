import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class KpiService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    employeeCode?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (query.employeeCode) {
      where.employee = { code: query.employeeCode };
    }
    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = new Date(query.startDate);
      if (query.endDate) where.date.lte = new Date(query.endDate);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.kpiRecord.findMany({
        where,
        include: {
          employee: true,
        },
        orderBy: { date: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.kpiRecord.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
