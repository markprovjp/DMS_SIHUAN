import { describe, test, expect, vi } from "vitest";
import { SyncService } from "../sync.service";
import { SyncJobRunner } from "../sync-job.runner";
import { SettingsService } from "../../settings/settings.service";
import { SyncStreamRegistry } from "../sync-stream.registry";
import { InProcessJobQueue } from "../../../common/jobs/in-process.job-queue";
import { SyncStatus } from "@prisma/client";

describe("Sync & Settings E2E Integration", () => {
  test("Sync service uses updated Mobiwork credentials from Settings", async () => {
    // Stub environment variables to avoid pollution from local .env
    vi.stubEnv("MOBIWORK_API_BASE", "");
    vi.stubEnv("MOBIWORK_USER_ID", "");
    vi.stubEnv("MOBIWORK_TOKEN", "");

    // 1. Mock Database settings storage
    const mockDbStore: Record<string, string> = {
      mobiworkApiBase: "https://custom-mobiwork.vn/api",
      mobiworkUserId: "mobi-user-123",
      mobiworkToken: "mobi-token-abc",
    };

    const mockPrisma: any = {
      setting: {
        findMany: vi.fn().mockImplementation(async () => {
          return Object.entries(mockDbStore).map(([key, value]) => ({
            key,
            value,
          }));
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          const val = mockDbStore[where.key];
          return val ? { key: where.key, value: val } : null;
        }),
      },
    };

    const settingsService = new SettingsService(mockPrisma);
    const streamRegistry = new SyncStreamRegistry(settingsService);
    const runner = new SyncJobRunner(mockPrisma, settingsService, streamRegistry);
    const queue = new InProcessJobQueue(mockPrisma);
    const service = new SyncService(mockPrisma, settingsService, runner, queue, streamRegistry);

    // Access private getMobiworkClient method to verify credentials propagation
    const client = await (service as any).getMobiworkClient();
    expect((client as any).config.apiBase).toBe("https://custom-mobiwork.vn/api");
    expect((client as any).config.userId).toBe("mobi-user-123");
    expect((client as any).config.token).toBe("mobi-token-abc");

    const runnerClient = await (runner as any).getMobiworkClient();
    expect((runnerClient as any).config.apiBase).toBe("https://custom-mobiwork.vn/api");
    expect((runnerClient as any).config.userId).toBe("mobi-user-123");
    expect((runnerClient as any).config.token).toBe("mobi-token-abc");

    vi.unstubAllEnvs();
  });

  test("startSyncJob enqueues job and runSync reuses the same jobId in database", async () => {
    const mockJobsDb: any[] = [];
    const mockPrisma: any = {
      syncJob: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = {
            id: `job-${Math.random().toString(36).substr(2, 9)}`,
            status: data.status,
            endpoint: data.endpoint,
            startDate: data.startDate,
            endDate: data.endDate,
            logs: data.logs || "",
            totalRecords: 0,
            processedCount: 0,
            createdAt: new Date(),
          };
          mockJobsDb.push(record);
          return record;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const record = mockJobsDb.find((j) => j.id === where.id);
          if (record) {
            Object.assign(record, data);
            return record;
          }
          throw new Error("Job not found");
        }),
      },
    };

    const mockSettingsService: any = {
      getAll: vi.fn().mockResolvedValue({}),
    };
    const streamRegistry = new SyncStreamRegistry(mockSettingsService);
    const runner = new SyncJobRunner(mockPrisma, mockSettingsService, streamRegistry);
    
    // Stub runner executeSync to prevent real API calls in integration test
    const executeSyncSpy = vi.spyOn(runner as any, "executeSync").mockResolvedValue(undefined);

    const mockQueue: any = {
      enqueue: vi.fn().mockResolvedValue("mock-queue-job-id"),
    };
    const service = new SyncService(mockPrisma, mockSettingsService, runner, mockQueue, streamRegistry);

    // 1. Client triggers startSyncJob
    const jobId = await service.startSyncJob(
      "/OpenAPI/V1/TimesheetData",
      "2026-06-01",
      "2026-06-07"
    );

    // Verify exactly 1 job was created in the database and is PENDING
    expect(mockJobsDb).toHaveLength(1);
    expect(mockJobsDb[0].id).toBe(jobId);
    expect(mockJobsDb[0].status).toBe("PENDING");

    // Verify enqueue was called with correct arguments
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      "mobiwork.sync",
      {
        syncJobId: jobId,
        endpoint: "/OpenAPI/V1/TimesheetData",
        startDate: "2026-06-01",
        endDate: "2026-06-07",
      },
      expect.any(Object)
    );

    // 2. Queue processes job (Simulate queue handler trigger)
    const payload = {
      syncJobId: jobId,
      endpoint: "/OpenAPI/V1/TimesheetData",
      startDate: "2026-06-01",
      endDate: "2026-06-07",
    };

    await runner.runSync(
      payload.endpoint,
      payload.startDate,
      payload.endDate,
      "FULL_REFRESH_OVERWRITE_DEDUPED",
      payload.syncJobId
    );

    // Verify that NO new job record was created and the status of the same jobId was updated to RUNNING
    expect(mockJobsDb).toHaveLength(1);
    expect(mockJobsDb[0].id).toBe(jobId);
    expect(mockJobsDb[0].status).toBe(SyncStatus.RUNNING);
    expect(executeSyncSpy).toHaveBeenCalledWith(
      jobId,
      "/OpenAPI/V1/TimesheetData",
      "2026-06-01",
      "2026-06-07",
      expect.any(String)
    );
  });

  test("startSyncJob throws BadRequestException when sync endpoint is not supported", async () => {
    const mockPrisma: any = {
      syncJob: {
        create: vi.fn(),
      },
    };
    const mockSettingsService: any = {
      getAll: vi.fn().mockResolvedValue({}),
    };
    const streamRegistry = new SyncStreamRegistry(mockSettingsService);
    const runner = new SyncJobRunner(mockPrisma, mockSettingsService, streamRegistry);
    const mockQueue: any = {
      enqueue: vi.fn(),
    };
    const service = new SyncService(mockPrisma, mockSettingsService, runner, mockQueue, streamRegistry);

    // /OpenAPI/V1/ItemBrand is not in the registry
    await expect(
      service.startSyncJob(
        "/OpenAPI/V1/ItemBrand",
        "2026-06-01",
        "2026-06-07"
      )
    ).rejects.toThrow(/Stream definition not found for \/OpenAPI\/V1\/ItemBrand/);

    expect(mockPrisma.syncJob.create).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });
});
