import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Role } from "@prisma/client";
import { VisionService } from "./vision.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../../common/roles.guard";
import { VisionAnalyzeDto } from "../../common/dto";

@Controller("vision")
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisionController {
  constructor(private visionService: VisionService) {}

  @Get("results")
  async getResults() {
    return this.visionService.getResults();
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("analyze")
  async analyzePhoto(@Body() body: VisionAnalyzeDto) {
    return this.visionService.analyzeCheckInPhoto(body.imageUrl, {
      employeeCode: body.employeeCode,
      date: body.date,
      checkType: body.checkType,
      locationText: body.locationText,
    });
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("timesheet-event/:eventId/analyze")
  async analyzeTimesheetEvent(
    @Param("eventId") eventId: string,
    @Body("imageUrl") imageUrl?: string,
  ) {
    return this.visionService.analyzeTimesheetEventPhoto(eventId, imageUrl);
  }

  @Post("test")
  async testVisionConnection(@Body() body: VisionAnalyzeDto) {
    return this.visionService.testVisionConnection(body.imageUrl);
  }
}
