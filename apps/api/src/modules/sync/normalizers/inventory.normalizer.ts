import { SyncNormalizer } from "./normalizer.interface";
import { parseMobiworkDate } from "@dms-admin/shared";
import * as crypto from "crypto";

export class InventoryNormalizer implements SyncNormalizer {
  async normalize(record: any, jobId: string, prisma: any): Promise<void> {
    const whCode = record.ma_kho || record.code_kho;
    if (!whCode) return;

    // 1. Get or create Warehouse
    let warehouse = await prisma.warehouse.findUnique({
      where: { code: whCode },
    });
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({
        data: { code: whCode, name: record.ten_kho || whCode },
      });
    }

    // 2. Get or create Employee Stub if present
    let empId: string | null = null;
    if (record.ma_nv) {
      let employee = await prisma.employee.findUnique({
        where: { code: record.ma_nv },
      });
      if (!employee) {
        employee = await prisma.employee.create({
          data: {
            code: record.ma_nv,
            name: record.ten_nv || record.ma_nv,
            isStub: true,
          },
        });
      }
      empId = employee.id;
    }

    const code = record.ma_phieu || record.so_phieu;
    const date = parseMobiworkDate(
      record.ngay || record.ngay_lap,
      "Asia/Bangkok",
    );

    const recordHash = crypto
      .createHash("md5")
      .update(`/OpenAPI/V1/Inventory-${code}-${JSON.stringify(record)}`)
      .digest("hex");

    // 3. Upsert InventoryDocument
    const invDoc = await prisma.inventoryDocument.upsert({
      where: { code },
      update: {
        type: record.loai || "KIỂM KHO",
        sourceEndpoint: "/OpenAPI/V1/Inventory",
        sourceKey: code,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
      create: {
        employeeId: empId,
        warehouseId: warehouse.id,
        code,
        type: record.loai || "KIỂM KHO",
        date,
        sourceEndpoint: "/OpenAPI/V1/Inventory",
        sourceKey: code,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
    });

    // 4. Sync InventoryItems in transaction
    const items = Array.isArray(record.chi_tiet) ? record.chi_tiet : [];

    await prisma.$transaction(async (tx: any) => {
      await tx.inventoryItem.deleteMany({
        where: { inventoryDocumentId: invDoc.id },
      });

      for (const i of items) {
        const prodCode = i.ma_sp || i.ma;
        if (!prodCode) continue;

        let dbProduct = await tx.product.findUnique({
          where: { code: prodCode },
        });
        if (!dbProduct) {
          dbProduct = await tx.product.create({
            data: {
              code: prodCode,
              name: i.ten_sp || prodCode,
              unit: i.don_vi || null,
              isStub: true,
            },
          });
        }

        await tx.inventoryItem.create({
          data: {
            inventoryDocumentId: invDoc.id,
            productId: dbProduct.id,
            quantity: i.so_luong ? Number(i.so_luong) : 0,
            value: i.thanh_tien ? Number(i.thanh_tien) : 0,
          },
        });
      }
    });
  }
}
