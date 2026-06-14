import { Module } from "@nestjs/common";
import { VisionService } from "./vision.service";
import { VisionController } from "./vision.controller";
import { SettingsModule } from "../settings/settings.module";
import { PrismaService } from "../../prisma.service";

@Module({
  imports: [SettingsModule],
  controllers: [VisionController],
  providers: [VisionService, PrismaService],
  exports: [VisionService],
})
export class VisionModule {}
