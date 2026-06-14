import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { Response } from "express";
import { TimesheetService } from "./timesheet.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TimesheetQueryDto, TimesheetExportDto } from "../../common/dto";

@Controller("timesheet")
@UseGuards(JwtAuthGuard)
export class TimesheetController {
  constructor(private timesheetService: TimesheetService) {}

  @Get("summary")
  async getSummary(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.timesheetService.getSummary(startDate, endDate);
  }

  /** Server-side paginated. */
  @Get("days")
  async getDays(
    @Query() q: TimesheetQueryDto,
    @Query("page", new DefaultValuePipe("1"), ParseIntPipe) page = 1,
    @Query("pageSize", new DefaultValuePipe("20"), ParseIntPipe) pageSize = 20,
  ) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    const parsedRiskLevels = q.riskLevels
      ? q.riskLevels
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    return this.timesheetService.getDays({
      employeeCode: q.employeeCode,
      departmentId: q.departmentId,
      startDate: q.startDate,
      endDate: q.endDate,
      riskLevels: parsedRiskLevels,
      page: safePage,
      pageSize: safeSize,
    });
  }

  @Get("days/:id")
  async getDayDetails(@Param("id") id: string) {
    return this.timesheetService.getDayDetails(id);
  }

  @Post("days/:id/evaluate")
  async reEvaluate(@Param("id") id: string) {
    return this.timesheetService.reEvaluate(id);
  }

  @Post("export")
  async exportReport(@Body() body: TimesheetExportDto, @Res() res: Response) {
    // Guard: chống request range quá lớn (gây OOM khi load 10000+ rows vào ExcelJS).
    // Max 31 ngày mỗi lần export theo production-readiness.md.
    const MAX_DAYS = 31;
    if (body.startDate && body.endDate) {
      const from = new Date(body.startDate);
      const to = new Date(body.endDate);
      const days =
        Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (days > MAX_DAYS) {
        res.status(400).json({
          statusCode: 400,
          error: "Bad Request",
          message: `Khoảng ngày tối đa ${MAX_DAYS} ngày mỗi lần xuất. Khoảng yêu cầu: ${days} ngày. Vui lòng tách nhiều lần.`,
        });
        return;
      }
    }
    const buffer = await this.timesheetService.generateExcelReport(
      body.startDate,
      body.endDate,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Bao_cao_cham_cong.xlsx"',
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
