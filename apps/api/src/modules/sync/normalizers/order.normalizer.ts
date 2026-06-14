import { SyncNormalizer } from "./normalizer.interface";
import { parseMobiworkDate } from "@dms-admin/shared";
import * as crypto from "crypto";

export class OrderNormalizer implements SyncNormalizer {
  async normalize(record: any, jobId: string, prisma: any): Promise<void> {
    const empCode = record.ma_nv || record.ma_nv_dat;
    const custCode = record.ma_kh || record.makh;
    if (!empCode || !custCode) return;

    // 1. Get or create Employee Stub
    let employee = await prisma.employee.findUnique({
      where: { code: empCode },
    });
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          code: empCode,
          name:
            record.ten_nv || record.ten_nhan_vien || record.ho_ten || empCode,
          isStub: true,
        },
      });
    }

    // 2. Get or create Customer Stub
    let customer = await prisma.customer.findUnique({
      where: { code: custCode },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          code: custCode,
          name:
            record.ten_kh || record.ten_khach_hang || record.ten || custCode,
          address: record.dia_chi || null,
          phone: record.sdt || record.so_dien_thoai || null,
          isStub: true,
        },
      });
    }

    const orderCode = record.ma_phieu || record.so_phieu || record.ma_don;
    const date = parseMobiworkDate(
      record.ngay_dat || record.ngay_yc,
      "Asia/Bangkok",
    );

    const recordHash = crypto
      .createHash("md5")
      .update(`/OpenAPI/V1/Order-${orderCode}-${JSON.stringify(record)}`)
      .digest("hex");

    // 3. Upsert Order
    const dbOrder = await prisma.order.upsert({
      where: { code: orderCode },
      update: {
        status: record.trang_thai || "HOÀN THÀNH",
        totalAmount: record.tong_tien_hang ? Number(record.tong_tien_hang) : 0,
        vatAmount: record.tong_tien_vat ? Number(record.tong_tien_vat) : 0,
        discount: record.ck_don_hang ? Number(record.ck_don_hang) : 0,
        payableAmount: record.phai_thanh_toan
          ? Number(record.phai_thanh_toan)
          : 0,
        sourceEndpoint: "/OpenAPI/V1/Order",
        sourceKey: orderCode,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
      create: {
        employeeId: employee.id,
        customerId: customer.id,
        code: orderCode,
        status: record.trang_thai || "HOÀN THÀNH",
        totalAmount: record.tong_tien_hang ? Number(record.tong_tien_hang) : 0,
        vatAmount: record.tong_tien_vat ? Number(record.tong_tien_vat) : 0,
        discount: record.ck_don_hang ? Number(record.ck_don_hang) : 0,
        payableAmount: record.phai_thanh_toan
          ? Number(record.phai_thanh_toan)
          : 0,
        date,
        sourceEndpoint: "/OpenAPI/V1/Order",
        sourceKey: orderCode,
        sourceHash: recordHash,
        syncJobId: jobId,
      },
    });

    // 4. Sync OrderItems in transaction
    const products = Array.isArray(record.san_pham) ? record.san_pham : [];

    await prisma.$transaction(async (tx: any) => {
      await tx.orderItem.deleteMany({
        where: { orderId: dbOrder.id },
      });

      for (const p of products) {
        const prodCode = p.ma_sp || p.ma_san_pham;
        if (!prodCode) continue;

        let dbProduct = await tx.product.findUnique({
          where: { code: prodCode },
        });

        if (!dbProduct) {
          dbProduct = await tx.product.create({
            data: {
              code: prodCode,
              name: p.ten_sp || prodCode,
              price: p.don_gia ? Number(p.don_gia) : 0,
              unit: p.ten_dvt || null,
              isStub: true,
            },
          });
        }

        await tx.orderItem.create({
          data: {
            orderId: dbOrder.id,
            productId: dbProduct.id,
            quantity: p.so_luong ? Number(p.so_luong) : 0,
            price: p.don_gia ? Number(p.don_gia) : 0,
            total: p.thanh_tien ? Number(p.thanh_tien) : 0,
            isPromo: p.is_km === true,
          },
        });
      }
    });
  }
}
