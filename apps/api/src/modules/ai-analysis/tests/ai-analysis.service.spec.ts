import { describe, test, expect, vi, beforeEach } from "vitest";
import { AiAnalysisService } from "../ai-analysis.service";

describe("AiAnalysisService Retry & Schema Validation", () => {
  let mockPrisma: any;
  let mockSettingsService: any;
  let mockTimesheetService: any;
  let mockAiProviderService: any;

  beforeEach(() => {
    mockPrisma = {
      aiAnalysisRun: {
        create: vi.fn().mockResolvedValue({ id: "run-id-123" }),
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn().mockResolvedValue({}),
      },
      aiInsight: { create: vi.fn().mockResolvedValue({}) },
      aiRecommendation: { create: vi.fn().mockResolvedValue({}) },
      aiEmployeeComment: { create: vi.fn().mockResolvedValue({}) },
      aiDataQualityWarning: { create: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      customer: { findMany: vi.fn().mockResolvedValue([]) },
      visit: { findMany: vi.fn().mockResolvedValue([]) },
      order: { findMany: vi.fn().mockResolvedValue([]) },
      kpiRecord: { findMany: vi.fn().mockResolvedValue([]) },
      inventoryDocument: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockSettingsService = {
      getAll: vi.fn().mockResolvedValue({
        aiTextModel: "cx/gpt-5.5",
        aiBaseUrl: "https://qrouter.online/v1",
      }),
    };

    mockTimesheetService = {
      getSummary: vi.fn().mockResolvedValue({ totalHours: 160 }),
      getDays: vi
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 0 }),
    };

    mockAiProviderService = {
      analyzeText: vi.fn(),
    };
  });

  test("runs successfully when AI returns valid JSON output", async () => {
    const validJsonOutput = {
      executiveSummary: "Tất cả bình thường",
      keyFindings: [],
      recommendations: [],
      employeeComments: [],
      dataQualityWarnings: [],
      timesheetInsights: [],
      visitInsights: [],
      orderInsights: [],
      kpiInsights: [],
      inventoryInsights: [],
      crossModuleInsights: [],
    };

    mockAiProviderService.analyzeText.mockResolvedValue({
      output: validJsonOutput,
      model: "cx/gpt-5.5",
      provider: "9router",
      usage: { inputTokens: 50, outputTokens: 50 },
    });

    const service = new AiAnalysisService(
      mockPrisma,
      mockSettingsService,
      mockTimesheetService,
      mockAiProviderService,
    );

    const result = await service.analyzeTimesheets("2026-06-01", "2026-06-07");

    expect(mockAiProviderService.analyzeText).toHaveBeenCalledTimes(1);
    expect(mockPrisma.aiAnalysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-id-123" },
        data: expect.objectContaining({
          status: "COMPLETED",
          executiveSummary: "Tất cả bình thường",
        }),
      }),
    );
  });

  test("retries once when AI returns invalid schema and succeeds after correction", async () => {
    const invalidJsonOutput = {
      executiveSummary: "Lỗi cấu trúc",
      // Thiếu keyFindings, recommendations, etc. để kích hoạt Zod error
    };

    const validJsonOutputAfterCorrection = {
      executiveSummary: "Đã sửa cấu trúc",
      keyFindings: [
        {
          severity: "info",
          title: "Đã trễ",
          evidence: "Nhân viên trễ",
          affectedEmployees: ["NV01"],
          affectedDepartments: ["Kinh doanh"],
        },
      ],
      recommendations: [],
      employeeComments: [],
      dataQualityWarnings: [],
      timesheetInsights: [],
      visitInsights: [],
      orderInsights: [],
      kpiInsights: [],
      inventoryInsights: [],
      crossModuleInsights: [],
    };

    // First call returns invalid schema, second call returns corrected schema
    mockAiProviderService.analyzeText
      .mockResolvedValueOnce({
        output: invalidJsonOutput,
        model: "cx/gpt-5.5",
        provider: "9router",
      })
      .mockResolvedValueOnce({
        output: validJsonOutputAfterCorrection,
        model: "cx/gpt-5.5",
        provider: "9router",
        usage: { inputTokens: 60, outputTokens: 80 },
      });

    const service = new AiAnalysisService(
      mockPrisma,
      mockSettingsService,
      mockTimesheetService,
      mockAiProviderService,
    );

    await service.analyzeTimesheets("2026-06-01", "2026-06-07");

    expect(mockAiProviderService.analyzeText).toHaveBeenCalledTimes(2);
    expect(mockPrisma.aiAnalysisRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-id-123" },
        data: expect.objectContaining({
          status: "COMPLETED",
          executiveSummary: "Đã sửa cấu trúc",
        }),
      }),
    );
  });

  test("buildManagementAnalysisInput aggregates data correctly", async () => {
    // 1. Mock timesheet
    mockTimesheetService.getSummary.mockResolvedValue({ totalHours: 160 });
    mockTimesheetService.getDays.mockResolvedValue({
      items: [
        {
          employeeId: "emp-1",
          employee: {
            code: "NV01",
            name: "Nguyen Van A",
            department: { name: "Sale" },
          },
          date: new Date("2026-06-01T08:00:00Z"),
          weekday: "Thứ Hai",
          evaluation: {
            score: 90,
            riskLevel: "GOOD",
            statusCodes: [],
            hasCheckIn: true,
          },
        },
        {
          employeeId: "emp-2",
          employee: {
            code: "NV02",
            name: "Tran Van B",
            department: { name: "Sale" },
          },
          date: new Date("2026-06-01T08:00:00Z"),
          weekday: "Thứ Hai",
          evaluation: {
            score: 40,
            riskLevel: "ABNORMAL",
            statusCodes: ["LATE"],
            hasCheckIn: true,
          },
        },
      ],
      total: 2,
    });

    // 2. Mock visits
    mockPrisma.visit.findMany.mockResolvedValue([
      {
        id: "v-1",
        employeeId: "emp-1",
        employee: { code: "NV01", name: "Nguyen Van A" },
        customer: { code: "C01", name: "Dai Ly A" },
        date: new Date("2026-06-01T09:00:00Z"),
        checkin: new Date("2026-06-01T09:00:00Z"),
        checkout: new Date("2026-06-01T09:00:10Z"), // 10s (unusual)
        isOnRoute: true,
        hasOrder: true,
      },
    ]);
    mockPrisma.customer.findMany.mockResolvedValue([
      { code: "C01", name: "Dai Ly A" },
      { code: "C02", name: "Dai Ly B" },
    ]);

    // 3. Mock orders
    mockPrisma.order.findMany.mockResolvedValue([
      {
        code: "O01",
        payableAmount: 500000,
        status: "APPROVED",
        employee: { code: "NV01", name: "Nguyen Van A" },
        customer: { code: "C01", name: "Dai Ly A" },
        items: [
          {
            quantity: 5,
            total: 500000,
            product: { code: "P01", name: "Sua Milo", unit: "Hop" },
          },
        ],
      },
    ]);

    // 4. Mock KPIs
    mockPrisma.kpiRecord.findMany.mockResolvedValue([
      {
        employee: { code: "NV01", name: "Nguyen Van A" },
        kpiName: "Doanh số tháng",
        targetValue: 10000000,
        actualValue: 500000,
        achievementRate: 0.05,
      },
    ]);

    // 5. Mock inventory
    mockPrisma.inventoryDocument.findMany.mockResolvedValue([
      {
        code: "INV01",
        type: "NHẬP KHO",
        warehouse: { name: "Kho Ha Noi" },
        items: [
          {
            quantity: 100,
            value: 2000000,
            product: { code: "P01", name: "Sua Milo" },
          },
        ],
      },
    ]);

    const service = new AiAnalysisService(
      mockPrisma,
      mockSettingsService,
      mockTimesheetService,
      mockAiProviderService,
    );

    const input = await service.buildManagementAnalysisInput(
      "2026-06-01",
      "2026-06-07",
    );

    // Verify timesheet
    expect(input.timesheetSummary).toEqual({ totalHours: 160 });
    expect(input.timesheetByEmployee).toHaveLength(2);
    expect(input.timesheetByEmployee[0].employeeCode).toBe("NV01");
    expect(input.timesheetByEmployee[1].averageScore).toBe(40);
    expect(input.timesheetByDepartment[0].departmentName).toBe("Sale");
    expect(input.timesheetByWeekday[0].weekday).toBe("Thứ Hai");
    expect(input.abnormalTimesheetDays[0].date).toBe("2026-06-01");

    // Verify visits
    expect(input.visitSummary.totalVisits).toBe(1);
    expect(input.visitSummary.onRouteRate).toBe(100);
    expect(input.visitByEmployee[0].employeeCode).toBe("NV01");
    expect(input.unusualRoutes).toHaveLength(1);
    expect(input.unusualRoutes[0].employeeCode).toBe("NV01");
    expect(input.missedCustomers).toEqual([{ code: "C02", name: "Dai Ly B" }]);
    expect(input.checkInWithoutVisitOrOrder).toHaveLength(1);
    expect(input.checkInWithoutVisitOrOrder[0].employeeCode).toBe("NV02"); // Co check-in nhung ko co visit

    // Verify orders
    expect(input.orderSummary.totalOrders).toBe(1);
    expect(input.orderSummary.totalRevenue).toBe(500000);
    expect(input.topEmployeesByRevenue[0].employeeCode).toBe("NV01");
    expect(input.productPerformance.topProducts[0].productCode).toBe("P01");

    // Verify KPIs
    expect(input.kpiSummary.totalKpiRecords).toBe(1);
    expect(input.kpiUnderTarget[0].employeeCode).toBe("NV01");

    // Verify inventory
    expect(input.inventorySummary.totalDocuments).toBe(1);
    expect(input.inventoryLargeMovements[0].docCode).toBe("INV01");
    expect(input.inventoryLargeMovements[0].totalQty).toBe(100);
  });
});
