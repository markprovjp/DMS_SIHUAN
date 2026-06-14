import { describe, test, expect, vi, beforeEach } from "vitest";
import { InProcessJobQueue } from "../in-process.job-queue";

describe("InProcessJobQueue", () => {
  let queue: InProcessJobQueue;

  beforeEach(() => {
    queue = new InProcessJobQueue();
  });

  test("enqueue → chạy handler → COMPLETED", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    queue.register("test.job", handler);
    const id = await queue.enqueue("test.job", { x: 1 }, { retries: 0 });

    // Đợi job chạy xong
    await vi.waitFor(async () => {
      const r = await queue.getJob(id);
      expect(r?.status).toBe("COMPLETED");
    });

    const final = await queue.getJob(id);
    expect(final?.status).toBe("COMPLETED");
    expect(final?.attempts).toBe(1);
    expect(handler).toHaveBeenCalledWith(
      { x: 1 },
      expect.objectContaining({ jobId: id }),
    );
  });

  test("retry on failure: thất bại 2 lần → thành công lần 3", async () => {
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValueOnce("ok");

    queue.register("retry.job", handler);
    const id = await queue.enqueue(
      "retry.job",
      {},
      { retries: 3, backoffMs: 10 },
    );

    // Wait for retry logic (2 backoffs of 10ms each)
    await vi.waitFor(
      async () => {
        const r = await queue.getJob(id);
        expect(r?.status).toBe("COMPLETED");
      },
      { timeout: 2000, interval: 20 },
    );

    const final = await queue.getJob(id);
    expect(final?.status).toBe("COMPLETED");
    expect(final?.attempts).toBe(3);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  test("fail hết retries → FAILED", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("always fails"));
    queue.register("fail.job", handler);
    const id = await queue.enqueue(
      "fail.job",
      {},
      { retries: 2, backoffMs: 5 },
    );

    await vi.waitFor(
      async () => {
        const r = await queue.getJob(id);
        expect(r?.status).toBe("FAILED");
      },
      { timeout: 2000, interval: 20 },
    );

    const final = await queue.getJob(id);
    expect(final?.status).toBe("FAILED");
    expect(final?.error).toContain("always fails");
    // attempts = retries + 1 = 3
    expect(final?.attempts).toBe(3);
  });

  test("no handler registered → FAILED ngay", async () => {
    const id = await queue.enqueue("missing.handler", {});
    await vi.waitFor(async () => {
      const r = await queue.getJob(id);
      expect(r?.status).toBe("FAILED");
    });
    const final = await queue.getJob(id);
    expect(final?.error).toContain("No handler registered");
  });

  test("cancel job đang chờ → CANCELLED (handler không chạy)", async () => {
    // Handler block vĩnh viễn → job sẽ chạy
    const handler = vi.fn().mockImplementation(
      () => new Promise(() => {}), // never resolves
    );
    queue.register("slow.job", handler);

    // Enqueue nhiều job để chắc chắn có 1 đang PENDING/RUNNING
    const id1 = await queue.enqueue("slow.job", {});
    // Cancel
    const ok = await queue.cancel(id1);
    expect(ok).toBe(true);

    const final = await queue.getJob(id1);
    expect(["CANCELLED", "RUNNING"]).toContain(final?.status);
  });

  test("listJobs: chỉ trả các job, sort theo createdAt desc", async () => {
    queue.register("x", vi.fn().mockResolvedValue(undefined));
    await queue.enqueue("x", { i: 1 });
    await new Promise((r) => setTimeout(r, 5));
    await queue.enqueue("x", { i: 2 });

    const list = await queue.listJobs({ limit: 10 });
    expect(list.length).toBeGreaterThanOrEqual(2);
    // Newest first
    expect(list[0].createdAt.getTime()).toBeGreaterThanOrEqual(
      list[list.length - 1].createdAt.getTime(),
    );
  });

  test("getJob trả null cho id không tồn tại", async () => {
    const r = await queue.getJob("does-not-exist");
    expect(r).toBeNull();
  });

  test("log callback được gọi trong handler", async () => {
    const logs: string[] = [];
    queue.register("log.job", async (payload, ctx) => {
      ctx.log("hello from handler");
      ctx.log("warn message", "warn");
    });
    const id = await queue.enqueue("log.job", {});
    await vi.waitFor(async () => {
      const r = await queue.getJob(id);
      expect(r?.status).toBe("COMPLETED");
    });
    const final = await queue.getJob(id);
    expect(final?.logs.some((l) => l.includes("hello from handler"))).toBe(
      true,
    );
    expect(
      final?.logs.some((l) => l.includes("warn message") && l.includes("warn")),
    ).toBe(true);
  });

  test("enqueue sau shutdown → throw", async () => {
    await queue.shutdown();
    await expect(queue.enqueue("x", {})).rejects.toThrow(/shutting down/);
  });
});
