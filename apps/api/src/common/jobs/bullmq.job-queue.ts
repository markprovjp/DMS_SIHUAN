import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue, Worker, Job } from "bullmq";
import { randomUUID } from "crypto";
import {
  JobQueue,
  JobRecord,
  JobStatus,
  JobOptions,
  JobContext,
} from "./job-queue.interface";

/** BullMQ-backed job queue — chạy qua Redis, dùng cho production multi-instance.
 *
 *  Yêu cầu:
 *  - REDIS_URL env var set
 *  - JobsModule.forRoot() với USE_BULL=1
 *
 *  Worker riêng để handle processing (Queue chỉ enqueue/get/cancel).
 */
@Injectable()
export class BullMqJobQueue implements JobQueue, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullMqJobQueue.name);
  private readonly handlers = new Map<
    string,
    (payload: any, ctx: JobContext) => Promise<void>
  >();
  private worker: Worker | null = null;

  constructor(@InjectQueue("dms-jobs") private readonly queue: Queue) {}

  onModuleInit() {
    this.logger.log(`BullMQ queue ready: ${this.queue.name}`);
    this.worker = new Worker(
      this.queue.name,
      async (job: Job) => {
        const handler = this.handlers.get(job.name);
        if (!handler) {
          throw new Error(`No handler registered for ${job.name}`);
        }
        const ctx: JobContext = {
          jobId: job.id ?? "unknown",
          attempt: job.attemptsMade + 1,
          signal: new AbortController().signal,
          log: (msg, level = "info") => {
            const line = `${new Date().toISOString()} [${level}] ${msg}`;
            if (level === "error") this.logger.error(`[${job.id}] ${msg}`);
            else if (level === "warn") this.logger.warn(`[${job.id}] ${msg}`);
            else this.logger.log(`[${job.id}] ${msg}`);
            return line;
          },
        };
        return handler(job.data, ctx);
      },
      { connection: this.queue.opts.connection },
    );
    this.worker.on("failed", (job, err) => {
      this.logger.error(
        `BullMQ job ${job?.id} (${job?.name}) failed: ${err.message}`,
      );
    });
    this.worker.on("completed", (job) => {
      this.logger.log(`BullMQ job ${job.id} (${job.name}) completed`);
    });
  }

  register(
    name: string,
    handler: (payload: any, ctx: JobContext) => Promise<void>,
  ) {
    this.handlers.set(name, handler);
    this.logger.log(`Registered BullMQ handler: ${name}`);
  }

  async enqueue<P>(
    name: string,
    payload: P,
    opts: JobOptions = {},
  ): Promise<string> {
    const id = randomUUID();
    await this.queue.add(name, payload as any, {
      jobId: id,
      attempts: (opts.retries ?? 3) + 1,
      backoff: { type: "exponential", delay: opts.backoffMs ?? 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    });
    return id;
  }

  async getJob(id: string): Promise<JobRecord | null> {
    const job = await this.queue.getJob(id);
    if (!job) return null;
    return this.toRecord(job);
  }

  async listJobs(
    opts: { name?: string; limit?: number; status?: JobStatus } = {},
  ): Promise<JobRecord[]> {
    const statuses = opts.status ? [this.mapStatus(opts.status)] : undefined;
    const jobs = await this.queue.getJobs(statuses as any, 0, opts.limit ?? 50);
    let filtered = jobs;
    if (opts.name) filtered = filtered.filter((j: any) => j.name === opts.name);
    return filtered.map((j: any) => this.toRecord(j));
  }

  async cancel(id: string): Promise<boolean> {
    const job = await this.queue.getJob(id);
    if (!job) return false;
    await job.remove();
    return true;
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
    await this.queue.close();
  }

  async shutdown() {
    await this.onModuleDestroy();
  }

  private mapStatus(
    s: JobStatus,
  ): "waiting" | "active" | "completed" | "failed" | "delayed" {
    switch (s) {
      case "PENDING":
      case "CANCELLED":
        return "waiting";
      case "RUNNING":
        return "active";
      case "COMPLETED":
        return "completed";
      case "FAILED":
        return "failed";
      default:
        return "waiting";
    }
  }

  private toRecord(j: any): JobRecord {
    const status: JobStatus = j.failedReason
      ? "FAILED"
      : j.finishedOn
        ? "COMPLETED"
        : j.processedOn
          ? "RUNNING"
          : "PENDING";
    return {
      id: j.id,
      name: j.name,
      payload: j.data,
      status,
      attempts: j.attemptsMade,
      maxRetries: (j.opts?.attempts ?? 1) - 1,
      error: j.failedReason,
      createdAt: new Date(j.timestamp),
      startedAt: j.processedOn ? new Date(j.processedOn) : undefined,
      completedAt: j.finishedOn ? new Date(j.finishedOn) : undefined,
      logs: [],
    };
  }
}
