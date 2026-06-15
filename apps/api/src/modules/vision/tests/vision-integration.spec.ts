import { describe, test, expect, vi } from "vitest";
import { VisionController } from "../vision.controller";
import { VisionService } from "../vision.service";
import { ImageClassification } from "@prisma/client";

describe("Vision Integration Test (Controller & Service)", () => {
  test("analyzePhoto (standalone image) executes successfully and saves to DB & AuditLog", async () => {
    // 1. Mock Database & Services
    const mockVisionAnalysisDb: any[] = [];
    const mockAuditLogDb: any[] = [];
    
    const mockPrisma: any = {
      visionAnalysis: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = {
            id: "va-123",
            ...data,
            createdAt: new Date(),
          };
          mockVisionAnalysisDb.push(record);
          return record;
        }),
      },
      auditLog: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = {
            id: "al-123",
            ...data,
            createdAt: new Date(),
          };
          mockAuditLogDb.push(record);
          return record;
        }),
      },
      visit: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const mockSettingsService: any = {
      getAll: vi.fn().mockResolvedValue({
        visionEnabled: "true",
        aiVisionModel: "gpt-4o",
        aiBaseUrl: "https://mock-ai.gateway",
      }),
    };

    const mockAiProviderService: any = {
      analyzeImage: vi.fn().mockResolvedValue({
        output: {
          classification: "VALID_WORK_CONTEXT",
          confidence: 0.95,
          reason: "Image shows employee at a retail store shelf with goods.",
          visibleIssues: [],
          suggestedAction: "None",
        },
        model: "gpt-4o",
        provider: "openai",
      }),
    };

    const service = new VisionService(mockPrisma, mockSettingsService, mockAiProviderService);
    const controller = new VisionController(service);

    // 2. Call controller method
    const dto = {
      imageUrl: "https://example.com/standalone.jpg",
      employeeCode: "EMP100",
      date: "2026-06-14",
      checkType: "CHECKIN",
      locationText: "Retail Store A",
    };

    const result = await controller.analyzePhoto(dto);

    // 3. Verify results
    expect(result).toBeDefined();
    expect(result.imageUrl).toBe("https://example.com/standalone.jpg");
    expect(result.classification).toBe("VALID_WORK_CONTEXT");
    expect(result.confidence).toBe(0.95);
    expect(result.reason).toBe("Image shows employee at a retail store shelf with goods.");

    // Verify Prisma create calls
    expect(mockPrisma.visionAnalysis.create).toHaveBeenCalledOnce();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();

    expect(mockVisionAnalysisDb).toHaveLength(1);
    expect(mockVisionAnalysisDb[0].visitId).toBeUndefined(); // Standalone has no visitId
    
    expect(mockAuditLogDb).toHaveLength(1);
    expect(mockAuditLogDb[0].action).toBe("VISION_ANALYSIS");
    expect(mockAuditLogDb[0].details).toContain("Host: mock-ai.gateway");
    expect(mockAuditLogDb[0].details).toContain("VALID_WORK_CONTEXT");
  });

  test("analyzeTimesheetEvent (timesheet context) executes successfully and saves to DB & AuditLog", async () => {
    // 1. Mock Database & Services
    const mockVisionAnalysisDb: any[] = [];
    const mockAuditLogDb: any[] = [];
    
    const mockPrisma: any = {
      timesheetEvent: {
        findUnique: vi.fn().mockResolvedValue({
          id: "event-456",
          images: ["https://example.com/timesheet-event.jpg"],
          type: "CHECKIN",
          location: "Showroom B",
          timesheetDay: {
            employee: {
              code: "EMP200",
            },
            date: new Date("2026-06-14T00:00:00Z"),
          },
        }),
      },
      visionAnalysis: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = {
            id: "va-456",
            ...data,
            createdAt: new Date(),
          };
          mockVisionAnalysisDb.push(record);
          return record;
        }),
      },
      auditLog: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = {
            id: "al-456",
            ...data,
            createdAt: new Date(),
          };
          mockAuditLogDb.push(record);
          return record;
        }),
      },
    };

    const mockSettingsService: any = {
      getAll: vi.fn().mockResolvedValue({
        visionEnabled: "true",
        aiVisionModel: "gpt-4o",
        aiBaseUrl: "https://mock-ai.gateway",
      }),
    };

    const mockAiProviderService: any = {
      analyzeImage: vi.fn().mockResolvedValue({
        output: {
          classification: "POSSIBLE_PRIVACY_RISK",
          confidence: 0.88,
          reason: "Image contains sensitive personal information not related to work.",
          visibleIssues: ["PII_EXPOSED"],
          suggestedAction: "Request check-in photo retake or blur image.",
        },
        model: "gpt-4o",
        provider: "openai",
      }),
    };

    const service = new VisionService(mockPrisma, mockSettingsService, mockAiProviderService);
    const controller = new VisionController(service);

    // 2. Call controller method for timesheet event
    const result = await controller.analyzeTimesheetEvent("event-456", "https://example.com/timesheet-event.jpg");

    // 3. Verify results
    expect(result).toBeDefined();
    expect(result.timesheetEventId).toBe("event-456");
    expect(result.classification).toBe("POSSIBLE_PRIVACY_RISK");
    expect(result.confidence).toBe(0.88);
    expect(result.reason).toBe("Image contains sensitive personal information not related to work.");

    // Verify DB
    expect(mockPrisma.timesheetEvent.findUnique).toHaveBeenCalledWith({
      where: { id: "event-456" },
      include: { timesheetDay: { include: { employee: true } } },
    });
    expect(mockPrisma.visionAnalysis.create).toHaveBeenCalledOnce();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();

    expect(mockVisionAnalysisDb).toHaveLength(1);
    expect(mockVisionAnalysisDb[0].timesheetEventId).toBe("event-456");
    expect(mockVisionAnalysisDb[0].classification).toBe("POSSIBLE_PRIVACY_RISK");

    expect(mockAuditLogDb).toHaveLength(1);
    expect(mockAuditLogDb[0].action).toBe("VISION_ANALYSIS_TIMESHEET");
    expect(mockAuditLogDb[0].details).toContain("Host: mock-ai.gateway");
    expect(mockAuditLogDb[0].details).toContain("POSSIBLE_PRIVACY_RISK");
    expect(mockAuditLogDb[0].details).toContain("EMP200");
  });
});
