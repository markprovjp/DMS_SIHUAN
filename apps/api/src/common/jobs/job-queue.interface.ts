/** Abstraction cho job queue.
 *  Mặc định dùng InProcessJobQueue (worker chạy trong API process).
 *  Nếu REDIS_URL set và @nestjs/bullmq được cài, có thể swap sang BullQueue implementation.
 *
 *  Job status lifecycle:
 *    PENDING → RUNNING → COMPLETED
 *                   ↘ FAILED (sau khi hết retries) ↘ CANCELLED
 */
export type JobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface JobOptions {
  /** Số lần retry khi fail. Default 3. */
  retries?: number;
  /** Backoff cố định giữa các retry (ms). Default 5000. */
  backoffMs?: number;
  /** Job này là long-running? (mặc định false). */
  longRunning?: boolean;
}

export interface JobHandler<P = unknown> {
  (payload: P, ctx: JobContext): Promise<void>;
}

export interface JobContext {
  jobId: string;
  attempt: number;
  signal: AbortSignal;
  log(message: string, level?: "info" | "warn" | "error"): void;
}

export interface JobRecord<P = unknown> {
  id: string;
  name: string;
  payload: P;
  status: JobStatus;
  attempts: number;
  maxRetries: number;
  error?: string | null;
  result?: unknown;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  logs: string[];
}

export interface JobQueue {
  /** Enqueue 1 job, return jobId ngay (không chờ chạy xong). */
  enqueue<P>(name: string, payload: P, opts?: JobOptions): Promise<string>;

  /** Lấy trạng thái hiện tại của 1 job. */
  getJob(id: string): Promise<JobRecord | null>;

  /** Lấy danh sách job gần đây. */
  listJobs(opts?: {
    name?: string;
    limit?: number;
    status?: JobStatus;
  }): Promise<JobRecord[]>;

  /** Hủy job nếu đang chạy. */
  cancel(id: string): Promise<boolean>;

  /** Worker graceful shutdown. */
  shutdown(): Promise<void>;
}
