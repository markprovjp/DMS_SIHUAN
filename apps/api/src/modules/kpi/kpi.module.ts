import { Module } from "@nestjs/common";
import { KpiService } from "./kpi.service";
import { KpiController } from "./kpi.controller";
import { PrismaService } from "../../prisma.service";

@Module({
  controllers: [KpiController],
  providers: [KpiService, PrismaService],
  exports: [KpiService],
})
export class KpiModule {}
