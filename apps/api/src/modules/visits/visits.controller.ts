import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { VisitsService } from "./visits.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { VisitsQueryDto } from "../../common/dto";

@Controller("visits")
@UseGuards(JwtAuthGuard)
export class VisitsController {
  constructor(private visitsService: VisitsService) {}

  @Get()
  async findAll(
    @Query() q: VisitsQueryDto,
    @Query("page", new DefaultValuePipe("1"), ParseIntPipe) page = 1,
    @Query("pageSize", new DefaultValuePipe("20"), ParseIntPipe) pageSize = 20,
  ) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    return this.visitsService.findAll({
      employeeCode: q.employeeCode,
      startDate: q.startDate,
      endDate: q.endDate,
      page: safePage,
      pageSize: safeSize,
    });
  }
}
