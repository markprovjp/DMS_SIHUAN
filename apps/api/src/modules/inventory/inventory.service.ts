import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};
    if (query.warehouseId) {
      where.warehouseId = query.warehouseId;
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
      this.prisma.inventoryDocument.findMany({
        where,
        include: {
          employee: true,
          warehouse: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { date: "desc" },
        skip,
        take: pageSize,
      }),
      this.prisma.inventoryDocument.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
