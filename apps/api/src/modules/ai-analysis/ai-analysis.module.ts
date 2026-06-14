import { Module } from "@nestjs/common";
import { AiAnalysisService } from "./ai-analysis.service";
import { AiAnalysisController } from "./ai-analysis.controller";
import { SettingsModule } from "../settings/settings.module";
import { TimesheetModule } from "../timesheet/timesheet.module";
import { PrismaService } from "../../prisma.service";

@Module({
  imports: [SettingsModule, TimesheetModule],
  controllers: [AiAnalysisController],
  providers: [AiAnalysisService, PrismaService],
  exports: [AiAnalysisService],
})
export class AiAnalysisModule {}
