import { Module } from "@nestjs/common";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { AuthModule } from "./modules/auth/auth.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SyncModule } from "./modules/sync/sync.module";
import { TimesheetModule } from "./modules/timesheet/timesheet.module";
import { VisitsModule } from "./modules/visits/visits.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { KpiModule } from "./modules/kpi/kpi.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { AiAnalysisModule } from "./modules/ai-analysis/ai-analysis.module";
import { VisionModule } from "./modules/vision/vision.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AiModule } from "./modules/ai/ai.module";
import { HealthModule } from "./modules/health/health.module";
import { JobsModule } from "./common/jobs/jobs.module";
import { PrismaService } from "./prisma.service";
import { GlobalExceptionFilter } from "./common/global-exception.filter";

@Module({
  imports: [
    // Global rate-limit: 100 requests / 60s / IP mặc định.
    // Login endpoint sẽ override với @Throttle() decorator để giới hạn chặt hơn.
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
    JobsModule.forRoot(),
    AuthModule,
    SettingsModule,
    SyncModule,
    TimesheetModule,
    VisitsModule,
    OrdersModule,
    KpiModule,
    InventoryModule,
    AiAnalysisModule,
    VisionModule,
    AuditModule,
    AiModule,
    HealthModule,
  ],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
