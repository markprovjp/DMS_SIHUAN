import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { SettingsService } from "../settings/settings.service";
import { MobiworkClient } from "@dms-admin/mobiwork-client";
import { SyncStreamRegistry } from "./sync-stream.registry";
import { SyncStatus, Prisma } from "@prisma/client";
import * as crypto from "crypto";

@Injectable()
export class SyncJobRunner {
  // Simple in-memory locks for local development
  private activeJobs: Set<string> = new Set();

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private streamRegistry: SyncStreamRegistry,
  ) {}

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

  private parseMobiworkDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const datePart = `${match[3]}-${match[2]}-${match[1]}`;
      const d = new Date(`${datePart}T00:00:00+07:00`);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  async runSync(
    endpoint: string,
    startDateStr: string,
    endDateStr: string,
    mode: string = "FULL_REFRESH_OVERWRITE_DEDUPED",
  ): Promise<string> {
    const lockId = `sync:${endpoint}:${startDateStr}:${endDateStr}:${mode}`;

    if (this.activeJobs.has(lockId)) {
      throw new InternalServerErrorException(
        "Tác vụ đồng bộ này hiện đang chạy, vui lòng không gửi yêu cầu trùng lặp.",
      );
    }

    this.activeJobs.add(lockId);

    const startDate = this.parseMobiworkDate(startDateStr);
    const endDate = this.parseMobiworkDate(endDateStr);

    const job = await this.prisma.syncJob.create({
      data: {
        endpoint,
        startDate,
        endDate,
        status: SyncStatus.RUNNING,
        logs: "Khởi động hàng đợi công việc đồng bộ (In-Process Runner)...\n",
      },
    });

    this.executeSync(job.id, endpoint, startDateStr, endDateStr, lockId).catch(
      (err) => {
        console.error(`Sync job ${job.id} failed in background:`, err);
      },
    );

    return job.id;
  }

  private async executeSync(
    jobId: string,
    endpoint: string,
    startDateStr: string,
    endDateStr: string,
    lockId: string,
  ) {
    let logs = `Bắt đầu đồng bộ dữ liệu từ ${startDateStr} đến ${endDateStr}...\n`;
    const streamDef = this.streamRegistry.getDefinition(endpoint);

    if (!streamDef) {
      logs += `Lỗi: Không tìm thấy cấu hình stream cho endpoint: ${endpoint}\n`;
      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: SyncStatus.FAILED,
          logs,
          error: `Stream definition not found for ${endpoint}`,
        },
      });
      this.activeJobs.delete(lockId);
      return;
    }

    if (streamDef.dependencies && streamDef.dependencies.length > 0) {
      logs += `Kiểm tra các stream phụ thuộc: ${streamDef.dependencies.join(", ")}\n`;
      for (const dep of streamDef.dependencies) {
        const state = await this.prisma.syncStreamState.findUnique({
          where: { streamName: dep },
        });
        if (!state || !state.lastSuccessfulRunAt) {
          logs += `Cảnh báo: Stream phụ thuộc [${dep}] chưa được đồng bộ thành công trước đó. Tiến hành đồng bộ có thể tạo dữ liệu stub.\n`;
        }
      }
    }

    try {
      const client = await this.getMobiworkClient();
      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: { logs: logs + `Đang kết nối tới Mobiwork API...\n` },
      });

      const payload = await client.callAll(
        endpoint,
        {
          tu_ngay: startDateStr,
          den_ngay: endDateStr,
        },
        { fetchAll: true },
      );

      const records = client.extractRecords(payload);
      logs += `Tải thành công ${records.length} bản ghi thô từ nguồn.\n`;

      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: {
          totalRecords: records.length,
          logs: logs + `Bắt đầu xử lý từng bản ghi...\n`,
        },
      });

      let processed = 0;
      let skippedCount = 0;
      let stubCount = 0;

      for (const record of records) {
        const sourceKey = streamDef.primaryKey(record);
        if (!sourceKey) {
          const reason =
            "Không xác định được mã khóa chính (Primary Key) của bản ghi thô.";
          await this.logSkippedRecord(jobId, endpoint, reason, record);
          skippedCount++;
          continue;
        }

        const rawJsonStr = JSON.stringify(record);
        const recordHash = crypto
          .createHash("md5")
          .update(`${endpoint}-${sourceKey}-${rawJsonStr}`)
          .digest("hex");

        await this.prisma.rawRecord.upsert({
          where: {
            sourceEndpoint_sourceKey: {
              sourceEndpoint: endpoint,
              sourceKey: sourceKey,
            },
          },
          update: {
            syncJobId: jobId,
            sourceHash: recordHash,
            rawJson: record as Prisma.JsonObject,
          },
          create: {
            syncJobId: jobId,
            sourceEndpoint: endpoint,
            sourceKey: sourceKey,
            sourceHash: recordHash,
            rawJson: record as Prisma.JsonObject,
          },
        });

        const prevEmployeeStubs = await this.prisma.employee.count({
          where: { isStub: true },
        });
        const prevCustomerStubs = await this.prisma.customer.count({
          where: { isStub: true },
        });
        const prevProductStubs = await this.prisma.product.count({
          where: { isStub: true },
        });

        try {
          await streamDef.normalizer.normalize(record, jobId, this.prisma);

          const nextEmployeeStubs = await this.prisma.employee.count({
            where: { isStub: true },
          });
          const nextCustomerStubs = await this.prisma.customer.count({
            where: { isStub: true },
          });
          const nextProductStubs = await this.prisma.product.count({
            where: { isStub: true },
          });

          if (
            nextEmployeeStubs > prevEmployeeStubs ||
            nextCustomerStubs > prevCustomerStubs ||
            nextProductStubs > prevProductStubs
          ) {
            stubCount++;
          }
        } catch (normErr: any) {
          const reason = `Normalize fail: ${normErr.message}`;
          await this.logSkippedRecord(jobId, endpoint, reason, record);
          skippedCount++;
        }

        processed++;
        if (processed % 20 === 0) {
          await this.prisma.syncJob.update({
            where: { id: jobId },
            data: { processedCount: processed },
          });
        }
      }

      await this.prisma.syncStreamState.upsert({
        where: { streamName: streamDef.streamName },
        update: {
          endpoint,
          lastCursor: endDateStr,
          lastSuccessfulRunAt: new Date(),
          lastJobId: jobId,
        },
        create: {
          streamName: streamDef.streamName,
          endpoint,
          mode: "FULL_REFRESH_OVERWRITE_DEDUPED",
          lastCursor: endDateStr,
          lastSuccessfulRunAt: new Date(),
          lastJobId: jobId,
        },
      });

      logs += `Đồng bộ hoàn tất. Tổng số bản ghi xử lý: ${processed}/${records.length}.\n`;
      if (skippedCount > 0) {
        logs += `Cảnh báo: Bỏ qua ${skippedCount} bản ghi lỗi (chi tiết trong SyncSkippedRecord).\n`;
      }
      if (stubCount > 0) {
        logs += `Thông báo: Đã tạo tự động ${stubCount} bản ghi Master Data Stub do khuyết thiếu thực thể.\n`;
      }

      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: SyncStatus.COMPLETED,
          processedCount: processed,
          logs,
        },
      });
    } catch (err: any) {
      logs += `Lỗi hệ thống: ${err.message}\n`;
      if (err.stack) logs += `${err.stack}\n`;
      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: SyncStatus.FAILED,
          logs,
          error: err.message,
        },
      });
    } finally {
      this.activeJobs.delete(lockId);
    }
  }

  private async logSkippedRecord(
    jobId: string,
    endpoint: string,
    reason: string,
    rawJson: any,
  ) {
    try {
      await this.prisma.syncSkippedRecord.create({
        data: {
          syncJobId: jobId,
          endpoint,
          reason,
          rawJson: rawJson as Prisma.JsonObject,
        },
      });
    } catch (e) {
      console.error("Failed to log skipped record:", e);
    }
  }
}
