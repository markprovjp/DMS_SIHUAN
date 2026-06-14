import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class VisitsService {
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
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.visit.findMany({
        where,
        include: {
          employee: { select: { id: true, code: true, name: true } },
          customer: {
            select: { id: true, code: true, name: true, address: true },
          },
        },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.visit.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
