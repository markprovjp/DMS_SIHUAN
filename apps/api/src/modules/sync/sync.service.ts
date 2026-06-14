import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { SettingsService } from "../settings/settings.service";
import { MobiworkClient } from "@dms-admin/mobiwork-client";
import { SyncJobRunner } from "./sync-job.runner";
import { InProcessJobQueue } from "../../common/jobs/in-process.job-queue";

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private syncJobRunner: SyncJobRunner,
    private jobQueue: InProcessJobQueue,
  ) {}

  onModuleInit() {
    // Đăng ký handler cho job tên "mobiwork.sync"
    this.jobQueue.register("mobiwork.sync", async (payload, ctx) => {
      const { syncJobId, endpoint, startDate, endDate } = payload as {
        syncJobId: string;
        endpoint: string;
        startDate: string;
        endDate: string;
      };
      ctx.log(
        `Start sync job ${syncJobId}: ${endpoint} ${startDate} → ${endDate}`,
      );
      // SyncJobRunner cần syncJobId để cập nhật record; nếu API cũ thì fallback
      // tạo record mới từ startDate/endDate.
      await this.syncJobRunner.runSync(endpoint, startDate, endDate);
      ctx.log("Sync completed");
    });
  }

  private async getMobiworkClient(): Promise<MobiworkClient> {
    const settings = await this.settingsService.getAll();
    const userId = process.env.MOBIWORK_USER_ID || settings["userId"] || "";
    const token = process.env.MOBIWORK_TOKEN || settings["token"] || "";
    const apiBase =
      process.env.MOBIWORK_API_BASE ||
      settings["apiBase"] ||
      "https://openapi.mobiwork.vn";

    return new MobiworkClient({ userId, token, apiBase });
  }

  async getEndpoints() {
    const client = await this.getMobiworkClient();
    return client.getEndpoints();
  }

  async getJobs() {
    return this.prisma.syncJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async getJob(id: string) {
    return this.prisma.syncJob.findUnique({
      where: { id },
    });
  }

  async runPreview(endpoint: string, startDateStr: string, endDateStr: string) {
    const client = await this.getMobiworkClient();
    const params = {
      tu_ngay: startDateStr,
      den_ngay: endDateStr,
      page_size: 5,
      page_number: 1,
    };
    try {
      const payload = await client.call(endpoint, params);
      const records = client.extractRecords(payload);
      return {
        endpoint,
        dateRange: { from: startDateStr, to: endDateStr },
        totalCount: payload?.total || records.length,
        previewRecords: records.slice(0, 5),
      };
    } catch (e: any) {
      throw new InternalServerErrorException(
        `Lỗi gọi Mobiwork API: ${e.message}`,
      );
    }
  }

  /** Tạo SyncJob DB record, sau đó enqueue job để chạy nền.
   *  Trả về jobId ngay để UI poll. */
  async startSyncJob(
    endpoint: string,
    startDateStr: string,
    endDateStr: string,
  ): Promise<string> {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const syncJob = await this.prisma.syncJob.create({
      data: {
        endpoint,
        startDate: start,
        endDate: end,
        status: "PENDING",
        totalRecords: 0,
        processedCount: 0,
        logs: "Đang khởi tạo...\n",
      },
    });

    // Enqueue qua JobQueue — fire-and-forget. UI poll /api/sync/jobs/:id
    const queueJobId = await this.jobQueue.enqueue(
      "mobiwork.sync",
      {
        syncJobId: syncJob.id,
        endpoint,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      { retries: 2, backoffMs: 5000, longRunning: true },
    );

    this.logger.log(
      `Enqueued sync job: queue=${queueJobId} db=${syncJob.id} endpoint=${endpoint}`,
    );
    return syncJob.id;
  }
}
