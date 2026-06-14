import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { AiAnalysisService } from "./ai-analysis.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../../common/roles.guard";
import { AiAnalyzeDto, AiRunsQueryDto } from "../../common/dto";

@Controller("ai")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiAnalysisController {
  constructor(private aiService: AiAnalysisService) {}

  /** Server-side paginated AI runs. */
  @Get("runs")
  async getRuns(
    @Query() q: AiRunsQueryDto,
    @Query("page", new DefaultValuePipe("1"), ParseIntPipe) page = 1,
    @Query("pageSize", new DefaultValuePipe("20"), ParseIntPipe) pageSize = 20,
  ) {
    // Validate an toàn: min 1, max 100. NaN/0/negative fallback về default.
    const safePage =
      Number.isFinite(page) && page >= 1 ? Math.min(page, 1000) : 1;
    let safeSize: number;
    if (q.limit) {
      // Backward compat: một số client cũ gửi ?limit=N — map sang pageSize.
      const n = Number(q.limit);
      safeSize = Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : 20;
    } else {
      safeSize =
        Number.isFinite(pageSize) && pageSize >= 1
          ? Math.min(pageSize, 100)
          : 20;
    }
    return this.aiService.getRuns({ page: safePage, pageSize: safeSize });
  }

  @Get("runs/:id")
  async getRun(@Param("id") id: string) {
    return this.aiService.getRun(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post("runs/:id/approve")
  async approveRun(@Param("id") id: string) {
    return this.aiService.approveRun(id);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post("timesheet/analyze")
  async analyzeTimesheets(@Body() body: AiAnalyzeDto) {
    return this.aiService.analyzeTimesheets(body.startDate, body.endDate);
  }

  @Post("test")
  async testTextConnection() {
    return this.aiService.testTextConnection();
  }
}
