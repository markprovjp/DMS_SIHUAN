import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { SettingsService } from "../settings/settings.service";
import { TimesheetService } from "../timesheet/timesheet.service";
import { AiProviderService } from "../ai/ai-provider.service";
import {
  AI_TEXT_ANALYSIS_SYSTEM_PROMPT,
  AI_TEXT_ANALYSIS_USER_PROMPT_TEMPLATE,
  AiAnalysisOutputSchema,
  AiAnalysisOutput,
} from "@dms-admin/ai-prompts";
import * as crypto from "crypto";

// Strict JSON Schema for OpenAI Structured Outputs
const InsightJsonSchema = {
  type: "object",
  properties: {
    severity: { type: "string", enum: ["info", "warning", "critical"] },
    title: { type: "string" },
    evidence: { type: "string" },
    affectedEmployees: { type: "array", items: { type: "string" } },
    affectedDepartments: { type: "array", items: { type: "string" } },
    affectedCustomers: { type: "array", items: { type: "string" } },
    suggestedAction: { type: "string" },
  },
  required: [
    "severity",
    "title",
    "evidence",
    "affectedEmployees",
    "affectedDepartments",
    "affectedCustomers",
    "suggestedAction",
  ],
  additionalProperties: false,
};

const AiAnalysisOutputJsonSchema = {
  name: "ai_analysis_output",
  strict: true,
  schema: {
    type: "object",
    properties: {
      executiveSummary: { type: "string" },
      keyFindings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            severity: { type: "string", enum: ["info", "warning", "critical"] },
            title: { type: "string" },
            evidence: { type: "string" },
            affectedEmployees: { type: "array", items: { type: "string" } },
            affectedDepartments: { type: "array", items: { type: "string" } },
          },
          required: [
            "severity",
            "title",
            "evidence",
            "affectedEmployees",
            "affectedDepartments",
          ],
          additionalProperties: false,
        },
      },
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["low", "medium", "high"] },
            action: { type: "string" },
            ownerRole: { type: "string" },
            dueHint: { type: ["string", "null"] },
          },
          required: ["priority", "action", "ownerRole", "dueHint"],
          additionalProperties: false,
        },
      },
      employeeComments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            employeeCode: { type: "string" },
            comment: { type: "string" },
            suggestedAction: { type: "string" },
          },
          required: ["employeeCode", "comment", "suggestedAction"],
          additionalProperties: false,
        },
      },
      dataQualityWarnings: {
        type: "array",
        items: { type: "string" },
      },
      timesheetInsights: { type: "array", items: InsightJsonSchema },
      visitInsights: { type: "array", items: InsightJsonSchema },
      orderInsights: { type: "array", items: InsightJsonSchema },
      kpiInsights: { type: "array", items: InsightJsonSchema },
      inventoryInsights: { type: "array", items: InsightJsonSchema },
      crossModuleInsights: { type: "array", items: InsightJsonSchema },
    },
    required: [
      "executiveSummary",
      "keyFindings",
      "recommendations",
      "employeeComments",
      "dataQualityWarnings",
      "timesheetInsights",
      "visitInsights",
      "orderInsights",
      "kpiInsights",
      "inventoryInsights",
      "crossModuleInsights",
    ],
    additionalProperties: false,
  },
};

@Injectable()
export class AiAnalysisService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private timesheetService: TimesheetService,
    private aiProviderService: AiProviderService,
  ) {}

  async getRuns(opts: { page?: number; pageSize?: number } = {}) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.aiAnalysisRun.findMany({
        include: {
          findings: true,
          recommendations: true,
          employeeComments: true,
          dataQualityWarnings: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
      }),
      this.prisma.aiAnalysisRun.count(),
    ]);

    return { items, total, page, pageSize };
  }

  async getRun(id: string) {
    return this.prisma.aiAnalysisRun.findUnique({
      where: { id },
      include: {
        findings: true,
        recommendations: true,
        employeeComments: true,
        dataQualityWarnings: true,
      },
    });
  }

  async approveRun(id: string) {
    return this.prisma.aiAnalysisRun.update({
      where: { id },
      data: { isApproved: true },
    });
  }

  async buildManagementAnalysisInput(startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    // 1. MODULE TIMESHEET
    const timesheetSummary = await this.timesheetService.getSummary(
      startDateStr,
      endDateStr,
    );
    const daysResp = await this.timesheetService.getDays({
      startDate: startDateStr,
      endDate: endDateStr,
      pageSize: 1000,
    });
    const days = daysResp.items;

    // timesheetByEmployee
    const empTimesheetMap = new Map<
      string,
      {
        total: number;
        abnormal: number;
        late: number;
        early: number;
        totalScore: number;
        name: string;
        missingCheckIn: number;
        missingCheckOut: number;
      }
    >();
    days.forEach((d) => {
      const code = d.employee.code;
      const stats = empTimesheetMap.get(code) || {
        total: 0,
        abnormal: 0,
        late: 0,
        early: 0,
        totalScore: 0,
        name: d.employee.name,
        missingCheckIn: 0,
        missingCheckOut: 0,
      };
      stats.total++;
      if (d.evaluation) {
        stats.totalScore += d.evaluation.score;
        if (d.evaluation.riskLevel === "ABNORMAL") stats.abnormal++;
        if (d.evaluation.statusCodes.includes("LATE")) stats.late++;
        if (d.evaluation.statusCodes.includes("EARLY_LEAVE")) stats.early++;
        if (!d.evaluation.hasCheckIn) stats.missingCheckIn++;
        if (!d.evaluation.hasCheckOut) stats.missingCheckOut++;
      }
      empTimesheetMap.set(code, stats);
    });

    const timesheetByEmployee = Array.from(empTimesheetMap.entries()).map(
      ([code, stats]) => ({
        employeeCode: code,
        employeeName: stats.name,
        daysCount: stats.total,
        averageScore:
          stats.total > 0 ? Math.round(stats.totalScore / stats.total) : 0,
        abnormalCount: stats.abnormal,
        lateCount: stats.late,
        earlyCount: stats.early,
        missingCheckInCount: stats.missingCheckIn,
        missingCheckOutCount: stats.missingCheckOut,
      }),
    );

    // timesheetByDepartment
    const depTimesheetMap = new Map<
      string,
      { total: number; abnormal: number; late: number }
    >();
    days.forEach((d) => {
      const depName = d.employee.department?.name || "Chưa phân phòng";
      const stats = depTimesheetMap.get(depName) || {
        total: 0,
        abnormal: 0,
        late: 0,
      };
      stats.total++;
      if (d.evaluation?.riskLevel === "ABNORMAL") stats.abnormal++;
      if (d.evaluation?.statusCodes.includes("LATE")) stats.late++;
      depTimesheetMap.set(depName, stats);
    });
    const timesheetByDepartment = Array.from(depTimesheetMap.entries()).map(
      ([name, stats]) => ({
        departmentName: name,
        ...stats,
      }),
    );

    // timesheetByWeekday
    const weekdayMap = new Map<
      string,
      { total: number; totalScore: number; abnormal: number }
    >();
    days.forEach((d) => {
      const wd = d.weekday || "Khác";
      const stats = weekdayMap.get(wd) || {
        total: 0,
        totalScore: 0,
        abnormal: 0,
      };
      stats.total++;
      if (d.evaluation) {
        stats.totalScore += d.evaluation.score;
        if (d.evaluation.riskLevel === "ABNORMAL") stats.abnormal++;
      }
      weekdayMap.set(wd, stats);
    });
    const timesheetByWeekday = Array.from(weekdayMap.entries()).map(
      ([wd, stats]) => ({
        weekday: wd,
        averageScore:
          stats.total > 0 ? Math.round(stats.totalScore / stats.total) : 0,
        abnormalCount: stats.abnormal,
      }),
    );

    // highMissingDataEmployees
    const highMissingDataEmployees = timesheetByEmployee
      .map((e) => ({
        ...e,
        totalMissing: e.missingCheckInCount + e.missingCheckOutCount,
      }))
      .filter((e) => e.totalMissing > 0)
      .sort((a, b) => b.totalMissing - a.totalMissing)
      .slice(0, 10)
      .map((e) => ({
        employeeCode: e.employeeCode,
        employeeName: e.employeeName,
        missingCheckInCount: e.missingCheckInCount,
        missingCheckOutCount: e.missingCheckOutCount,
        totalMissing: e.totalMissing,
      }));

    // abnormalTimesheetDays
    const dayAnomalyMap = new Map<string, number>();
    days.forEach((d) => {
      if (d.evaluation?.riskLevel === "ABNORMAL") {
        const dStr = d.date.toISOString().substring(0, 10);
        dayAnomalyMap.set(dStr, (dayAnomalyMap.get(dStr) || 0) + 1);
      }
    });
    const abnormalTimesheetDays = Array.from(dayAnomalyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3. MODULE ORDER (Được tải sớm để phục vụ kiểm tra chéo)
    const orders = await this.prisma.order.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        employee: true,
        customer: true,
        items: {
          include: { product: true },
        },
      },
    });

    // 2. MODULE VISIT
    const visits = await this.prisma.visit.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        employee: true,
        customer: true,
      },
    });

    const totalVisits = visits.length;
    const onRouteVisits = visits.filter((v) => v.isOnRoute).length;
    const hasOrderVisits = visits.filter((v) => v.hasOrder).length;

    const visitSummary = {
      totalVisits,
      onRouteVisits,
      hasOrderVisits,
      onRouteRate:
        totalVisits > 0 ? Math.round((onRouteVisits / totalVisits) * 100) : 0,
      hasOrderRate:
        totalVisits > 0 ? Math.round((hasOrderVisits / totalVisits) * 100) : 0,
    };

    // visitByEmployee
    const empVisitMap = new Map<
      string,
      { total: number; onRoute: number; hasOrder: number; name: string }
    >();
    visits.forEach((v) => {
      const code = v.employee.code;
      const stats = empVisitMap.get(code) || {
        total: 0,
        onRoute: 0,
        hasOrder: 0,
        name: v.employee.name,
      };
      stats.total++;
      if (v.isOnRoute) stats.onRoute++;
      if (v.hasOrder) stats.hasOrder++;
      empVisitMap.set(code, stats);
    });
    const visitByEmployee = Array.from(empVisitMap.entries()).map(
      ([code, stats]) => ({
        employeeCode: code,
        employeeName: stats.name,
        visitCount: stats.total,
        onRouteCount: stats.onRoute,
        hasOrderCount: stats.hasOrder,
        onRouteRate:
          stats.total > 0 ? Math.round((stats.onRoute / stats.total) * 100) : 0,
      }),
    );

    // checkInWithoutVisitOrOrder
    const checkInWithoutVisitOrOrder: any[] = [];
    days.forEach((d) => {
      const empId = d.employeeId;
      const empCode = d.employee.code;
      const dStr = d.date.toISOString().substring(0, 10);
      const dayVisits = visits.filter(
        (v) =>
          v.employeeId === empId &&
          v.date.toISOString().substring(0, 10) === dStr,
      );
      const dayOrders = orders.filter(
        (o) =>
          o.employeeId === empId &&
          o.date.toISOString().substring(0, 10) === dStr,
      );
      if (
        d.evaluation?.hasCheckIn &&
        dayVisits.length === 0 &&
        dayOrders.length === 0
      ) {
        checkInWithoutVisitOrOrder.push({
          employeeCode: empCode,
          employeeName: d.employee.name,
          date: dStr,
          reason:
            "Có check-in đầu ngày nhưng không ghi nhận lượt viếng thăm (visit) hay đơn hàng (order) nào",
        });
      }
    });

    // unusualRoutes
    const unusualRoutes = visits
      .filter(
        (v) =>
          v.checkin &&
          v.checkout &&
          v.checkout.getTime() - v.checkin.getTime() < 60_000,
      )
      .slice(0, 10)
      .map((v) => ({
        employeeCode: v.employee.code,
        employeeName: v.employee.name,
        customerName: v.customer.name,
        date: v.date.toISOString().substring(0, 10),
        durationSeconds:
          v.checkin && v.checkout
            ? Math.round((v.checkout.getTime() - v.checkin.getTime()) / 1000)
            : 0,
        reason: "Thời gian viếng thăm quá ngắn (dưới 60 giây)",
      }));

    // missedCustomers
    const missedCustomers = "not available";

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.payableAmount, 0);
    const orderStatusMap = new Map<string, { count: number; value: number }>();
    orders.forEach((o) => {
      const stats = orderStatusMap.get(o.status) || { count: 0, value: 0 };
      stats.count++;
      stats.value += o.payableAmount;
      orderStatusMap.set(o.status, stats);
    });

    const orderSummary = {
      totalOrders,
      totalRevenue,
      averageOrderValue:
        totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      byStatus: Array.from(orderStatusMap.entries()).map(([status, stats]) => ({
        status,
        count: stats.count,
        value: Math.round(stats.value),
      })),
    };

    // topEmployeesByRevenue
    const empRevenueMap = new Map<string, { name: string; revenue: number }>();
    orders.forEach((o) => {
      const code = o.employee.code;
      const stats = empRevenueMap.get(code) || {
        name: o.employee.name,
        revenue: 0,
      };
      stats.revenue += o.payableAmount;
      empRevenueMap.set(code, stats);
    });
    const topEmployeesByRevenue = Array.from(empRevenueMap.entries())
      .map(([code, stats]) => ({
        employeeCode: code,
        employeeName: stats.name,
        revenue: Math.round(stats.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // abnormalOrders
    const avgOrderValue = orderSummary.averageOrderValue;
    const abnormalOrders = orders
      .filter((o) => o.payableAmount > avgOrderValue * 3)
      .slice(0, 10)
      .map((o) => ({
        orderCode: o.code,
        employeeName: o.employee.name,
        customerName: o.customer.name,
        payableAmount: o.payableAmount,
        reason: "Đơn hàng có giá trị cao bất thường so với trung bình",
      }));

    // productPerformance
    const prodMap = new Map<
      string,
      { name: string; quantity: number; value: number }
    >();
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const code = item.product.code;
        const stats = prodMap.get(code) || {
          name: item.product.name,
          quantity: 0,
          value: 0,
        };
        stats.quantity += item.quantity;
        stats.value += item.total;
        prodMap.set(code, stats);
      });
    });
    const productPerformanceList = Array.from(prodMap.entries()).map(
      ([code, stats]) => ({
        productCode: code,
        productName: stats.name,
        quantity: stats.quantity,
        value: Math.round(stats.value),
      }),
    );
    const topProducts = [...productPerformanceList]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const slowProducts = [...productPerformanceList]
      .sort((a, b) => a.value - b.value)
      .slice(0, 5);

    // 4. MODULE KPI
    const kpis = await this.prisma.kpiRecord.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        employee: true,
      },
    });

    const kpiSummary = {
      totalKpiRecords: kpis.length,
      averageAchievementRate:
        kpis.length > 0
          ? Math.round(
              (kpis.reduce((sum, k) => sum + k.achievementRate, 0) /
                kpis.length) *
                100,
            ) / 100
          : 0,
    };

    const kpiUnderTarget = kpis
      .filter((k) => k.achievementRate < 0.8)
      .slice(0, 10)
      .map((k) => ({
        employeeCode: k.employee.code,
        employeeName: k.employee.name,
        kpiName: k.kpiName,
        targetValue: k.targetValue,
        actualValue: k.actualValue,
        achievementRate: k.achievementRate,
      }));

    // 5. MODULE INVENTORY
    const inventoryDocs = await this.prisma.inventoryDocument.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        warehouse: true,
        items: {
          include: { product: true },
        },
      },
    });

    const docTypeMap = new Map<string, number>();
    inventoryDocs.forEach((d) => {
      docTypeMap.set(d.type, (docTypeMap.get(d.type) || 0) + 1);
    });

    const inventorySummary = {
      totalDocuments: inventoryDocs.length,
      byType: Array.from(docTypeMap.entries()).map(([type, count]) => ({
        type,
        count,
      })),
    };

    // inventoryLargeMovements
    const inventoryLargeMovements = inventoryDocs
      .map((d) => {
        const totalValue = d.items.reduce((sum, item) => sum + item.value, 0);
        const totalQty = d.items.reduce((sum, item) => sum + item.quantity, 0);
        return {
          docCode: d.code,
          warehouseName: d.warehouse.name,
          type: d.type,
          itemCount: d.items.length,
          totalQty,
          totalValue: Math.round(totalValue),
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return {
      period: { from: startDateStr, to: endDateStr },
      timesheetSummary,
      timesheetByEmployee: timesheetByEmployee.slice(0, 15),
      timesheetByDepartment,
      timesheetByWeekday,
      highMissingDataEmployees,
      abnormalTimesheetDays,
      visitSummary,
      visitByEmployee: visitByEmployee.slice(0, 15),
      onRouteRate: visitSummary.onRouteRate,
      checkInWithoutVisitOrOrder: checkInWithoutVisitOrOrder.slice(0, 10),
      unusualRoutes,
      missedCustomers,
      orderSummary,
      topEmployeesByRevenue,
      abnormalOrders,
      productPerformance: {
        topProducts,
        slowProducts,
      },
      kpiSummary,
      kpiUnderTarget,
      inventorySummary,
      inventoryLargeMovements,
    };
  }

  async analyzeTimesheets(startDateStr: string, endDateStr: string) {
    const settings = await this.settingsService.getAll();
    const model =
      settings["aiTextModel"] ||
      process.env.AI_TEXT_MODEL ||
      settings["openaiTextModel"] ||
      process.env.OPENAI_TEXT_MODEL ||
      "cx/gpt-5.5";

    // 1. Fetch server-side aggregated input data across multiple modules
    const inputData = await this.buildManagementAnalysisInput(
      startDateStr,
      endDateStr,
    );

    const inputHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(inputData))
      .digest("hex");
    const startTime = Date.now();

    // Create a PENDING run log
    const runLog = await this.prisma.aiAnalysisRun.create({
      data: {
        startDate: new Date(startDateStr),
        endDate: new Date(endDateStr),
        executiveSummary: "Quá trình phân tích AI đang chạy...",
        model,
        promptVersion: "1.0.0",
        inputHash,
        status: "PENDING",
      },
    });

    let attempts = 1;
    let parsedData: AiAnalysisOutput | null = null;
    let usage: any = null;
    let finalModel = model;
    let finalProvider = "openai";

    try {
      const callAI = async (promptText: string) => {
        return this.aiProviderService.analyzeText<AiAnalysisOutput>({
          system: AI_TEXT_ANALYSIS_SYSTEM_PROMPT,
          user: promptText,
          jsonSchema: AiAnalysisOutputJsonSchema,
        });
      };

      const userPrompt = AI_TEXT_ANALYSIS_USER_PROMPT_TEMPLATE(
        JSON.stringify(inputData, null, 2),
      );

      let response = await callAI(userPrompt);
      parsedData = response.output;
      usage = response.usage;
      finalModel = response.model;
      finalProvider = response.provider;

      try {
        parsedData = AiAnalysisOutputSchema.parse(parsedData);
      } catch (valError: any) {
        // Retry with correction prompt on validation failure
        attempts++;
        const correctionPrompt = `
Dữ liệu JSON trả về trước đó không khớp với schema Zod yêu cầu.
Lỗi phân tích: ${valError.message}
Dữ liệu JSON lỗi:
${JSON.stringify(parsedData)}

Hãy điều chỉnh định dạng JSON trả về sao cho khớp 100% với schema và trường bắt buộc.
`;
        response = await callAI(correctionPrompt);
        parsedData = response.output;
        usage = response.usage;
        finalModel = response.model;
        finalProvider = response.provider;
        parsedData = AiAnalysisOutputSchema.parse(parsedData);
      }

      const outputHash = crypto
        .createHash("sha256")
        .update(JSON.stringify(parsedData))
        .digest("hex");

      const latencyMs = Date.now() - startTime;
      const baseUrl =
        settings["aiBaseUrl"] ||
        process.env.AI_BASE_URL ||
        "https://qrouter.online/v1";
      let baseHost = "qrouter.online";
      try {
        if (baseUrl && baseUrl.startsWith("http")) {
          baseHost = new URL(baseUrl).hostname;
        } else {
          baseHost = baseUrl;
        }
      } catch {
        baseHost = baseUrl;
      }

      // 3. Write structured results to Database in a transaction
      await this.prisma.$transaction(async (tx: any) => {
        await tx.aiAnalysisRun.update({
          where: { id: runLog.id },
          data: {
            executiveSummary: parsedData!.executiveSummary,
            outputHash,
            status: "COMPLETED",
            tokenUsagePrompt: usage?.inputTokens || 0,
            tokenUsageCompletion: usage?.outputTokens || 0,
            model: finalModel,
            provider: finalProvider,
            baseHost,
            outputJson: parsedData as any,
            latencyMs,
          },
        });

        // Insert key findings (AiInsight)
        for (const f of parsedData!.keyFindings) {
          await tx.aiInsight.create({
            data: {
              runId: runLog.id,
              severity: f.severity,
              title: f.title,
              evidence: f.evidence,
              affectedUnits: [...f.affectedEmployees, ...f.affectedDepartments],
            },
          });
        }

        // Insert recommendations
        for (const r of parsedData!.recommendations) {
          await tx.aiRecommendation.create({
            data: {
              runId: runLog.id,
              priority: r.priority,
              action: r.action,
              ownerRole: r.ownerRole,
              dueHint: r.dueHint,
            },
          });
        }

        // Insert employee comments
        for (const c of parsedData!.employeeComments) {
          await tx.aiEmployeeComment.create({
            data: {
              runId: runLog.id,
              employeeCode: c.employeeCode,
              comment: c.comment,
              suggestedAction: c.suggestedAction,
            },
          });
        }

        // Insert data quality warnings
        for (const w of parsedData!.dataQualityWarnings) {
          await tx.aiDataQualityWarning.create({
            data: {
              runId: runLog.id,
              message: w,
            },
          });
        }
      });

      // Save Audit log
      await this.prisma.auditLog.create({
        data: {
          action: "AI_ANALYSIS_RUN",
          details: `Đã chạy phân tích AI thành công sử dụng ${finalProvider} (Host: ${baseHost}) cho khoảng ngày ${startDateStr} đến ${endDateStr}. ID: ${runLog.id}`,
        },
      });

      return this.getRun(runLog.id);
    } catch (e: any) {
      // Mark run as failed in database instead of crashing API
      await this.prisma.aiAnalysisRun.update({
        where: { id: runLog.id },
        data: {
          status: "FAILED",
          errorMessage: e.message,
          executiveSummary: "Quá trình phân tích AI thất bại.",
        },
      });

      await this.prisma.auditLog.create({
        data: {
          action: "AI_ANALYSIS_FAILED",
          details: `Phân tích AI thất bại cho khoảng ngày ${startDateStr} đến ${endDateStr}. Lỗi: ${e.message}`,
        },
      });

      throw new InternalServerErrorException(`Lỗi gọi AI: ${e.message}`);
    }
  }

  async testTextConnection() {
    try {
      const response = await this.aiProviderService.analyzeText<{
        message: string;
      }>({
        system:
          'Bạn là robot kiểm tra kết nối. Hãy trả về JSON có dạng { "message": "ok" }.',
        user: "kiểm tra kết nối",
        jsonSchema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
            required: ["message"],
            additionalProperties: false,
          },
        },
      });
      return {
        success: true,
        message: response.output.message,
        model: response.model,
        provider: response.provider,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
      };
    }
  }
}
