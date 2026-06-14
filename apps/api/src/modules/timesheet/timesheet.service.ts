import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { SyncService } from "../sync/sync.service";
import { SettingsService } from "../settings/settings.service";
import { evaluateTimesheetDay } from "../sync/timesheet-evaluator";
import * as ExcelJS from "exceljs";

@Injectable()
export class TimesheetService {
  constructor(
    private prisma: PrismaService,
    private syncService: SyncService,
    private settingsService: SettingsService,
  ) {}

  async getSummary(startDateStr?: string, endDateStr?: string) {
    const where: any = {};
    if (startDateStr && endDateStr) {
      where.date = {
        gte: new Date(startDateStr),
        lte: new Date(endDateStr),
      };
    }

    const evaluations = await this.prisma.timesheetEvaluation.findMany({
      where: {
        timesheetDay: where,
      },
    });

    const totalDays = evaluations.length;
    const abnormalCount = evaluations.filter(
      (e) => e.riskLevel === "ABNORMAL",
    ).length;
    const checkCount = evaluations.filter(
      (e) => e.riskLevel === "CHECK",
    ).length;
    const goodCount = evaluations.filter((e) => e.riskLevel === "GOOD").length;

    let missingCheckInCount = 0;
    let missingCheckOutCount = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;

    for (const e of evaluations) {
      if (!e.hasCheckIn) missingCheckInCount++;
      if (!e.hasCheckOut) missingCheckOutCount++;
      if (e.statusCodes.includes("LATE")) lateCount++;
      if (e.statusCodes.includes("EARLY_LEAVE")) earlyLeaveCount++;
    }

    const employees = await this.prisma.employee.count();
    const departments = await this.prisma.department.count();

    return {
      employeeCount: employees,
      departmentCount: departments,
      workdayCount: totalDays,
      missingCheckInCount,
      missingCheckOutCount,
      lateCount,
      earlyLeaveCount,
      abnormalCount,
      checkCount,
      goodCount,
      dataQualityRate:
        totalDays > 0 ? ((goodCount / totalDays) * 100).toFixed(0) : "0",
    };
  }

  async getDays(filters: {
    employeeCode?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
    riskLevels?: string[];
    statusCodes?: string[];
    page?: number;
    pageSize?: number;
  }) {
    const where: any = {};

    if (filters.employeeCode) {
      where.employee = { code: filters.employeeCode };
    }

    if (filters.departmentId) {
      where.employee = {
        ...where.employee,
        departmentId: filters.departmentId,
      };
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters.riskLevels && filters.riskLevels.length > 0) {
      where.evaluation = {
        riskLevel: { in: filters.riskLevels },
      };
    }

    if (filters.statusCodes && filters.statusCodes.length > 0) {
      where.evaluation = {
        ...where.evaluation,
        statusCodes: { hasSome: filters.statusCodes },
      };
    }

    // Server-side pagination với stable order + tie-breaker
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.timesheetDay.findMany({
        where,
        include: {
          employee: {
            include: { department: true },
          },
          evaluation: true,
        },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.timesheetDay.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getDayDetails(id: string) {
    const day = await this.prisma.timesheetDay.findUnique({
      where: { id },
      include: {
        employee: {
          include: { department: true },
        },
        events: true,
        evaluation: true,
      },
    });

    if (!day) {
      throw new NotFoundException("Không tìm thấy ngày công");
    }

    // Load matching visits
    const startOfDay = new Date(day.date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(day.date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const visits = await this.prisma.visit.findMany({
      where: {
        employeeId: day.employee.id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: true,
      },
    });

    return {
      ...day,
      visits,
    };
  }

  async reEvaluate(dayId: string) {
    await evaluateTimesheetDay(dayId, this.prisma, this.settingsService);
    return this.getDayDetails(dayId);
  }

  async generateExcelReport(
    startDate?: string,
    endDate?: string,
  ): Promise<Buffer> {
    const daysResp = await this.getDays({
      startDate,
      endDate,
      pageSize: 10000,
    });
    const days = daysResp.items;

    const workbook = new ExcelJS.Workbook();

    // 1. Sheet Tổng Quan
    const wsOverview = workbook.addWorksheet("Tong_quan");
    wsOverview.views = [{ state: "frozen", ySplit: 1 }];
    wsOverview.columns = [
      { header: "Chỉ số", key: "metric", width: 25 },
      { header: "Số lượng", key: "value", width: 15 },
    ];
    const summary = await this.getSummary(startDate, endDate);
    wsOverview.addRows([
      { metric: "Tổng số nhân viên", value: summary.employeeCount },
      { metric: "Tổng số ngày công", value: summary.workdayCount },
      { metric: "Lượt đi trễ (LATE)", value: summary.lateCount },
      { metric: "Lượt về sớm (EARLY_LEAVE)", value: summary.earlyLeaveCount },
      { metric: "Thiếu check-in", value: summary.missingCheckInCount },
      { metric: "Thiếu check-out", value: summary.missingCheckOutCount },
      { metric: "Số ngày bất thường (ABNORMAL)", value: summary.abnormalCount },
      {
        metric: "Tỷ lệ đạt chuẩn chuyên cần (%)",
        value: `${summary.dataQualityRate}%`,
      },
    ]);

    // Format Overview Sheet Header
    wsOverview.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsOverview.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },
    };

    // 2. Sheet Chấm Công
    const wsTimesheet = workbook.addWorksheet("Cham_cong");
    wsTimesheet.views = [{ state: "frozen", ySplit: 1 }];
    wsTimesheet.columns = [
      { header: "Mã nhân viên", key: "code", width: 15 },
      { header: "Tên nhân viên", key: "name", width: 25 },
      { header: "Phòng ban", key: "department", width: 20 },
      { header: "Ngày", key: "date", width: 15 },
      { header: "Thứ", key: "weekday", width: 12 },
      { header: "Vào", key: "in", width: 10 },
      { header: "Ra", key: "out", width: 10 },
      { header: "Số giờ làm", key: "hours", width: 12 },
      { header: "Điểm số", key: "score", width: 12 },
      { header: "Đánh giá", key: "risk", width: 15 },
    ];

    days.forEach((d) => {
      wsTimesheet.addRow({
        code: d.employee.code,
        name: d.employee.name,
        department: d.employee.department?.name || "",
        date: d.date.toISOString().substring(0, 10),
        weekday: d.weekday || "",
        in: d.evaluation?.firstCheckIn || "",
        out: d.evaluation?.lastCheckOut || "",
        hours:
          d.evaluation?.workHours !== null
            ? Number(d.evaluation.workHours).toFixed(1)
            : "",
        score: d.evaluation?.score !== null ? Number(d.evaluation.score) : "",
        risk: d.evaluation?.riskLevel || "CHƯA ĐÁNH GIÁ",
      });
    });

    // Format Timesheet Header
    wsTimesheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsTimesheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },
    };

    // Color code Risk levels
    wsTimesheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const riskCell = row.getCell("risk");
      if (riskCell.value === "ABNORMAL") {
        riskCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFC7CE" },
        }; // Light Red
        riskCell.font = { color: { argb: "FF9C0006" }, bold: true };
      } else if (riskCell.value === "CHECK") {
        riskCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEB9C" },
        }; // Light Yellow
        riskCell.font = { color: { argb: "FF9C6500" }, bold: true };
      } else if (riskCell.value === "GOOD") {
        riskCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFC6EFCE" },
        }; // Light Green
        riskCell.font = { color: { argb: "FF006100" }, bold: true };
      }
    });

    // 3. Sheet Cảnh Báo Anomaly
    const wsWarnings = workbook.addWorksheet("Canh_bao");
    wsWarnings.views = [{ state: "frozen", ySplit: 1 }];
    wsWarnings.columns = [
      { header: "Mã nhân viên", key: "code", width: 15 },
      { header: "Tên nhân viên", key: "name", width: 25 },
      { header: "Ngày công", key: "date", width: 15 },
      { header: "Điểm số", key: "score", width: 12 },
      { header: "Các lỗi phát hiện", key: "reasons", width: 50 },
      { header: "Đề xuất xử lý", key: "suggestions", width: 50 },
    ];

    days
      .filter((d) => d.evaluation && d.evaluation.riskLevel !== "GOOD")
      .forEach((d) => {
        wsWarnings.addRow({
          code: d.employee.code,
          name: d.employee.name,
          date: d.date.toISOString().substring(0, 10),
          score: d.evaluation?.score,
          reasons: d.evaluation?.reasons.join("; ") || "",
          suggestions: d.evaluation?.suggestions.join("; ") || "",
        });
      });

    // Format Warnings Header
    wsWarnings.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    wsWarnings.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC00000" },
    }; // Red header

    // 4. Auto-enable filters for worksheets
    wsTimesheet.autoFilter = "A1:J1";
    wsWarnings.autoFilter = "A1:F1";

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
