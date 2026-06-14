import { SyncNormalizer } from "./normalizer.interface";
import { parseMobiworkDate, combineLocalDateAndTime } from "@dms-admin/shared";
import * as crypto from "crypto";

export class VisitNormalizer implements SyncNormalizer {
  async normalize(record: any, jobId: string, prisma: any): Promise<void> {
    const empCode = record.ma_nv || record.ma_nhan_vien;
    if (!empCode) return;

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

    const visits = Array.isArray(record.thoi_gian_vt)
      ? record.thoi_gian_vt
      : [];
    for (const v of visits) {
      const custCode = v.ma_kh || v.makh;
      if (!custCode) continue;

      // 2. Get or create Customer Stub
      let customer = await prisma.customer.findUnique({
        where: { code: custCode },
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            code: custCode,
            name: v.ten_kh || v.tenkh || custCode,
            address: v.dia_chi || null,
            phone: v.sdt || null,
            isStub: true,
          },
        });
      }

      const rawDate = parseMobiworkDate(v.ngay, "Asia/Bangkok");
      let checkin: Date | null = null;
      let checkout: Date | null = null;

      if (v.checkin) {
        checkin = combineLocalDateAndTime(rawDate, v.checkin, "Asia/Bangkok");
      }
      if (v.checkout) {
        checkout = combineLocalDateAndTime(rawDate, v.checkout, "Asia/Bangkok");
      }

      // Generate unique source key & hash for Visit
      const visitKey = `${employee.code}_${customer.code}_${v.ngay}_${v.checkin || ""}`;
      const visitHash = crypto
        .createHash("md5")
        .update(`/OpenAPI/V1/VisitData-${visitKey}-${JSON.stringify(v)}`)
        .digest("hex");

      // 3. Upsert Visit
      await prisma.visit.upsert({
        where: { sourceHash: visitHash },
        update: {
          checkin,
          checkout,
          addressCheckin: v.dia_chi_checkin || null,
          isOnRoute:
            v.dung_tuyen === true ||
            v.dung_tuyen === "Có" ||
            v.dung_tuyen === "C",
          hasOrder:
            v.don_hang === true || v.don_hang === "Có" || v.don_hang === "C",
          hasStock:
            v.ghi_ton === true || v.ghi_ton === "Có" || v.ghi_ton === "C",
          note: v.ghi_chu || null,
          images: Array.isArray(v.hinh_anh) ? v.hinh_anh : [],
          sourceEndpoint: "/OpenAPI/V1/VisitData",
          sourceKey: visitKey,
          syncJobId: jobId,
        },
        create: {
          employeeId: employee.id,
          customerId: customer.id,
          date: rawDate,
          checkin,
          checkout,
          addressCheckin: v.dia_chi_checkin || null,
          isOnRoute:
            v.dung_tuyen === true ||
            v.dung_tuyen === "Có" ||
            v.dung_tuyen === "C",
          hasOrder:
            v.don_hang === true || v.don_hang === "Có" || v.don_hang === "C",
          hasStock:
            v.ghi_ton === true || v.ghi_ton === "Có" || v.ghi_ton === "C",
          note: v.ghi_chu || null,
          images: Array.isArray(v.hinh_anh) ? v.hinh_anh : [],
          sourceEndpoint: "/OpenAPI/V1/VisitData",
          sourceKey: visitKey,
          sourceHash: visitHash,
          syncJobId: jobId,
        },
      });
    }
  }
}
