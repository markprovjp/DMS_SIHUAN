import { Controller, Get, Post, Param, UseGuards, Res } from "@nestjs/common";
import { Response } from "express";
import { InProcessJobQueue } from "./in-process.job-queue";
import { JwtAuthGuard } from "../../modules/auth/jwt-auth.guard";

/** Generic job controller — UI dùng để poll status / cancel.
 *  Endpoint này sẽ được tái sử dụng bởi sync, ai-analysis, export,... */
@Controller("jobs")
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private queue: InProcessJobQueue) {}

  @Get(":id")
  async getOne(@Param("id") id: string, @Res() res: Response) {
    const job = await this.queue.getJob(id);
    if (!job) {
      res.status(404).json({
        statusCode: 404,
        error: "Not Found",
        message: `Job ${id} không tồn tại`,
      });
      return;
    }
    res.json(job);
  }

  @Post(":id/cancel")
  async cancel(@Param("id") id: string) {
    const ok = await this.queue.cancel(id);
    return { success: ok, id };
  }

  @Get()
  async list() {
    return this.queue.listJobs({ limit: 50 });
  }
}
