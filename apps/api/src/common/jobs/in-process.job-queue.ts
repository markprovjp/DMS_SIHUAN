import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  JobQueue,
  JobRecord,
  JobStatus,
  JobOptions,
  JobHandler,
  JobContext,
} from "./job-queue.interface";

/** In-process job queue.
 *  - Workers chạy trong cùng Node process.
 *  - Phù hợp cho MVP / dev / single-instance production.
 *  - Khi scale horizontal, cần swap sang Redis/BullMQ implementation.
 *
 *  Đặc điểm:
 *  - Retry với exponential backoff (cap 60s).
 *  - Graceful shutdown — drain in-flight jobs.
 *  - Có thể subscribe nhiều handler cho cùng 1 job name (lấy handler cuối).
 */
@Injectable()
export class InProcessJobQueue implements JobQueue, OnModuleDestroy {
  private readonly logger = new Logger(InProcessJobQueue.name);
  private readonly jobs = new Map<string, JobRecord>();
  private readonly handlers = new Map<string, JobHandler>();
  private readonly abortControllers = new Map<string, AbortController>();
  private shuttingDown = false;

  /** Đăng ký handler cho 1 job name. */
  register<P>(name: string, handler: JobHandler<P>): void {
    this.handlers.set(name, handler as JobHandler);
    this.logger.log(`Registered job handler: ${name}`);
  }

  async enqueue<P>(
    name: string,
    payload: P,
    opts: JobOptions = {},
  ): Promise<string> {
    if (this.shuttingDown) {
      throw new Error("Job queue is shutting down");
    }
    const id = randomUUID();
    const record: JobRecord<P> = {
      id,
      name,
      payload,
      status: "PENDING",
      attempts: 0,
      maxRetries: opts.retries ?? 3,
      createdAt: new Date(),
      logs: [],
    };
    this.jobs.set(id, record as JobRecord);

    // Fire-and-forget; không await
    this.runJob(id, record, opts).catch((e) =>
      this.logger.error(`runJob unhandled error for ${id}: ${e.message}`),
    );

    return id;
  }

  private async runJob(
    id: string,
    record: JobRecord,
    opts: JobOptions,
  ): Promise<void> {
    const handler = this.handlers.get(record.name);
    if (!handler) {
      this.markFailed(
        id,
        `No handler registered for job name "${record.name}"`,
      );
      return;
    }

    const ac = new AbortController();
    this.abortControllers.set(id, ac);

    const totalAttempts = (record.maxRetries ?? 3) + 1;
    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      if (ac.signal.aborted) {
        this.markCancelled(id);
        return;
      }
      record.status = "RUNNING";
      record.attempts = attempt;
      record.startedAt = new Date();
      this.appendLog(id, `[attempt ${attempt}/${totalAttempts}] started`);

      const ctx: JobContext = {
        jobId: id,
        attempt,
        signal: ac.signal,
        log: (msg, level = "info") => this.appendLog(id, `[${level}] ${msg}`),
      };

      try {
        await handler(record.payload, ctx);
        record.status = "COMPLETED";
        record.completedAt = new Date();
        this.appendLog(id, `Completed in ${attempt} attempt(s)`);
        this.abortControllers.delete(id);
        return;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        this.appendLog(id, `Failed: ${errMsg}`, "error");
        record.error = errMsg;

        if (attempt < totalAttempts) {
          // Exponential backoff, cap 60s
          const base = opts.backoffMs ?? 5000;
          const wait = Math.min(60_000, base * Math.pow(2, attempt - 1));
          this.appendLog(id, `Retrying in ${wait}ms...`, "warn");
          await this.sleep(wait, ac.signal);
        } else {
          this.markFailed(id, `Hết ${totalAttempts} lần thử: ${errMsg}`);
          return;
        }
      }
    }
  }

  private markFailed(id: string, reason: string) {
    const r = this.jobs.get(id);
    if (!r) return;
    r.status = "FAILED";
    r.error = reason;
    r.completedAt = new Date();
    this.appendLog(id, `FAILED: ${reason}`, "error");
    this.abortControllers.delete(id);
  }

  private markCancelled(id: string) {
    const r = this.jobs.get(id);
    if (!r) return;
    r.status = "CANCELLED";
    r.completedAt = new Date();
    this.appendLog(id, "Cancelled", "warn");
    this.abortControllers.delete(id);
  }

  private appendLog(
    id: string,
    msg: string,
    level: "info" | "warn" | "error" = "info",
  ) {
    const r = this.jobs.get(id);
    if (!r) return;
    const line = `${new Date().toISOString()} ${msg}`;
    r.logs.push(line);
    if (level === "error") this.logger.error(`[${id}] ${msg}`);
    else if (level === "warn") this.logger.warn(`[${id}] ${msg}`);
    else this.logger.log(`[${id}] ${msg}`);
  }

  async getJob(id: string): Promise<JobRecord | null> {
    return this.jobs.get(id) ?? null;
  }

  async listJobs(
    opts: { name?: string; limit?: number; status?: JobStatus } = {},
  ): Promise<JobRecord[]> {
    let list = Array.from(this.jobs.values());
    if (opts.name) list = list.filter((j) => j.name === opts.name);
    if (opts.status) list = list.filter((j) => j.status === opts.status);
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list.slice(0, opts.limit ?? 50);
  }

  async cancel(id: string): Promise<boolean> {
    const r = this.jobs.get(id);
    if (!r) return false;
    if (
      r.status === "COMPLETED" ||
      r.status === "FAILED" ||
      r.status === "CANCELLED"
    ) {
      return false;
    }
    const ac = this.abortControllers.get(id);
    if (ac) ac.abort("cancelled");
    return true;
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    this.logger.log("Job queue shutting down — cancelling in-flight jobs");
    for (const ac of this.abortControllers.values()) ac.abort("shutdown");
    // Wait briefly for jobs to settle
    await this.sleep(2000, new AbortController().signal).catch(() => {});
  }

  async shutdown() {
    await this.onModuleDestroy();
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
}
