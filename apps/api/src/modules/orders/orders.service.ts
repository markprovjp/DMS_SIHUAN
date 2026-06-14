import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    employeeCode?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (query.employeeCode) {
      where.employee = { code: query.employeeCode };
    }
    if (query.status) {
      where.status = query.status;
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
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          code: true,
          status: true,
          payableAmount: true,
          date: true,
          employee: { select: { id: true, code: true, name: true } },
          customer: { select: { id: true, code: true, name: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              product: {
                select: { id: true, code: true, name: true, unit: true },
              },
            },
          },
        },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async approve(id: string) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "ORDER_APPROVE",
        details: `Đã duyệt đơn hàng mã ${order.code} (ID: ${id})`,
      },
    });

    return order;
  }

  async reject(id: string) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "ORDER_REJECT",
        details: `Đã từ chối đơn hàng mã ${order.code} (ID: ${id})`,
      },
    });

    return order;
  }
}
