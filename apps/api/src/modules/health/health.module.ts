import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { SettingsModule } from "../settings/settings.module";

@Module({
  imports: [SettingsModule, AuthModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class HealthModule {}
