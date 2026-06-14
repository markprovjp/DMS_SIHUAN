import { SyncNormalizer } from "./normalizer.interface";
import { parseMobiworkDate } from "@dms-admin/shared";
import * as crypto from "crypto";

export class KpiNormalizer implements SyncNormalizer {
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

    const date = parseMobiworkDate(
      record.ngay || record.thoi_gian,
      "Asia/Bangkok",
    );
    const dateStr = date.toISOString().substring(0, 10);

    // Generate deterministic source key & hash
    const kpiKey = `${employee.code}_${record.ten_kpi || record.kpi || "KPI"}_${dateStr}`;
    const kpiHash = crypto
      .createHash("md5")
      .update(`/OpenAPI/V1/KPI-${kpiKey}-${JSON.stringify(record)}`)
      .digest("hex");

    // 2. Upsert KpiRecord
    await prisma.kpiRecord.upsert({
      where: { sourceHash: kpiHash },
      update: {
        targetValue: record.chi_tieu ? Number(record.chi_tieu) : 0,
        actualValue: record.thuc_hien ? Number(record.thuc_hien) : 0,
        achievementRate: record.ty_le_dat ? Number(record.ty_le_dat) : 0,
        date,
        sourceEndpoint: "/OpenAPI/V1/KPI",
        sourceKey: kpiKey,
        syncJobId: jobId,
      },
      create: {
        employeeId: employee.id,
        kpiName: record.ten_kpi || record.kpi || "KPI",
        targetValue: record.chi_tieu ? Number(record.chi_tieu) : 0,
        actualValue: record.thuc_hien ? Number(record.thuc_hien) : 0,
        achievementRate: record.ty_le_dat ? Number(record.ty_le_dat) : 0,
        date,
        sourceEndpoint: "/OpenAPI/V1/KPI",
        sourceKey: kpiKey,
        sourceHash: kpiHash,
        syncJobId: jobId,
      },
    });
  }
}
