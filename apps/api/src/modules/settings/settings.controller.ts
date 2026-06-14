import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../../common/roles.guard";
import { UpdateSettingsDto } from "../../common/dto";

@Controller("settings")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  async getAll() {
    return this.settingsService.getAllMasked();
  }

  /** Cập nhật settings.
   *  - DTO `UpdateSettingsDto` whitelist tất cả field được phép.
   *  - Field lạ bị ValidationPipe từ chối (whitelist+forbidNonWhitelisted).
   *  - KHÔNG cho phép ghi secret: aiApiKey/mobiworkToken — nếu field rỗng
   *    thì giữ nguyên giá trị cũ (handled by SettingsService.updateMany). */
  @Patch()
  async updateMany(@Body() body: UpdateSettingsDto) {
    return this.settingsService.updateMany(body as Record<string, unknown>);
  }
}
