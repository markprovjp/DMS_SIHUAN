import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { KpiService } from "./kpi.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("kpi")
@UseGuards(JwtAuthGuard)
export class KpiController {
  constructor(private kpiService: KpiService) {}

  @Get()
  async findAll(
    @Query("employeeCode") employeeCode?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page", new DefaultValuePipe("1"), ParseIntPipe) page = 1,
    @Query("pageSize", new DefaultValuePipe("20"), ParseIntPipe) pageSize = 20,
  ) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    return this.kpiService.findAll({
      employeeCode,
      startDate,
      endDate,
      page: safePage,
      pageSize: safeSize,
    });
  }
}
