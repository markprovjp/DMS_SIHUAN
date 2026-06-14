import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@prisma/client";
import { SyncService } from "./sync.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../../common/roles.guard";
import { SyncDto } from "../../common/dto";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Get("mobiwork/endpoints")
  async getEndpoints() {
    return this.syncService.getEndpoints();
  }

  @Post("mobiwork/preview")
  async runPreview(@Body() body: SyncDto) {
    return this.syncService.runPreview(
      body.endpoint,
      body.startDate,
      body.endDate,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post("sync/run")
  async runSync(@Body() body: SyncDto) {
    const jobId = await this.syncService.startSyncJob(
      body.endpoint,
      body.startDate,
      body.endDate,
    );
    return { success: true, jobId };
  }

  @Get("sync/jobs")
  async getJobs() {
    return this.syncService.getJobs();
  }

  @Get("sync/jobs/:id")
  async getJob(@Param("id") id: string) {
    return this.syncService.getJob(id);
  }
}
