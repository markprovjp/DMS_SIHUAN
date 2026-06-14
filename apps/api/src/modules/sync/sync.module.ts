import { Module } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { SyncController } from "./sync.controller";
import { SettingsModule } from "../settings/settings.module";
import { PrismaService } from "../../prisma.service";
import { SyncStreamRegistry } from "./sync-stream.registry";
import { SyncJobRunner } from "./sync-job.runner";

@Module({
  imports: [SettingsModule],
  controllers: [SyncController],
  providers: [SyncService, PrismaService, SyncStreamRegistry, SyncJobRunner],
  exports: [SyncService, SyncStreamRegistry, SyncJobRunner],
})
export class SyncModule {}
