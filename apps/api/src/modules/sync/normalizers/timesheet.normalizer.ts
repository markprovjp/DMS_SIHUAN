import { SyncNormalizer } from "./normalizer.interface";
import { parseMobiworkDate, combineLocalDateAndTime } from "@dms-admin/shared";
import { evaluateTimesheetDay } from "../timesheet-evaluator";
import * as crypto from "crypto";

export class TimesheetNormalizer implements SyncNormalizer {
  constructor(private settingsService: any) {}

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
          isStub: true, // Master Stub Created
        },
      });
      // We will let the JobRunner log warning/metadata about stub creation
    }

    // Parse the fields from record
    const dayEntries = Object.entries(record)
      .map(([key, val]) => ({ key, dayData: this.parseJsonObject(val) }))
      .filter(
        ({ dayData }) =>
          dayData &&
          (dayData.ngay || dayData.thu || Array.isArray(dayData.data_cc)),
      );

    for (const { dayData } of dayEntries) {
      const rawDate = parseMobiworkDate(dayData.ngay, "Asia/Bangkok");
      const datePart = rawDate.toISOString().substring(0, 10);

      const dayHash = crypto
        .createHash("md5")
        .update(
          `/OpenAPI/V1/TimesheetData-${employee.code}-${datePart}-${JSON.stringify(dayData)}`,
        )
        .digest("hex");

      // 2. Upsert TimesheetDay
      const tsDay = await prisma.timesheetDay.upsert({
        where: {
          employeeId_date: { employeeId: employee.id, date: rawDate },
        },
        update: {
          weekday: dayData.thu || null,
          sourceEndpoint: "/OpenAPI/V1/TimesheetData",
          sourceKey: `${employee.code}_${datePart}`,
          sourceHash: dayHash,
          syncJobId: jobId,
        },
        create: {
          employeeId: employee.id,
          date: rawDate,
          weekday: dayData.thu || null,
          sourceEndpoint: "/OpenAPI/V1/TimesheetData",
          sourceKey: `${employee.code}_${datePart}`,
          sourceHash: dayHash,
          syncJobId: jobId,
        },
      });

      // 3. Upsert TimesheetEvents idempotently
      const events = Array.isArray(dayData.data_cc) ? dayData.data_cc : [];
      for (const ev of events) {
        const eventTime = combineLocalDateAndTime(
          rawDate,
          ev.thoi_gian || "00:00:00",
          "Asia/Bangkok",
        );

        // Generate deterministic event hash
        const eventHash = crypto
          .createHash("md5")
          .update(
            `${tsDay.id}-${ev.loai || "Chấm công"}-${ev.thoi_gian}-${ev.dia_diem || ""}`,
          )
          .digest("hex");

        await prisma.timesheetEvent.upsert({
          where: { sourceHash: eventHash },
          update: {
            type: ev.loai || "Chấm công",
            time: eventTime,
            location: ev.dia_diem || null,
            note: ev.ghi_chu || null,
            images: Array.isArray(ev.hinh_anim || ev.hinh_anh)
              ? ev.hinh_anim || ev.hinh_anh
              : [],
          },
          create: {
            timesheetDayId: tsDay.id,
            type: ev.loai || "Chấm công",
            time: eventTime,
            location: ev.dia_diem || null,
            note: ev.ghi_chu || null,
            images: Array.isArray(ev.hinh_anim || ev.hinh_anh)
              ? ev.hinh_anim || ev.hinh_anh
              : [],
            sourceHash: eventHash,
          },
        });
      }

      // 4. Recalculate/Evaluate scores
      await evaluateTimesheetDay(tsDay.id, prisma, this.settingsService);
    }
  }

  private parseJsonObject(val: any): any {
    if (!val) return null;
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return null;
    }
  }
}
