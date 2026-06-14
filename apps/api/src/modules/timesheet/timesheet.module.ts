import { Module } from "@nestjs/common";
import { TimesheetService } from "./timesheet.service";
import { TimesheetController } from "./timesheet.controller";
import { SyncModule } from "../sync/sync.module";
import { SettingsModule } from "../settings/settings.module";
import { PrismaService } from "../../prisma.service";

@Module({
  imports: [SyncModule, SettingsModule],
  controllers: [TimesheetController],
  providers: [TimesheetService, PrismaService],
  exports: [TimesheetService],
})
export class TimesheetModule {}
