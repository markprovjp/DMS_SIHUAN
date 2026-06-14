import {
  IsEmail,
  IsString,
  IsNumber,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsOptional,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

/** Body của POST /api/auth/login */
export class LoginDto {
  @IsEmail({}, { message: "Email không đúng định dạng" })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(1, { message: "Mật khẩu không được để trống" })
  @MaxLength(200)
  password!: string;
}

/** Optional body fallback for POST /api/auth/refresh.
 *  Browser flow should use the httpOnly cookie. */
export class RefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  refresh_token?: string;
}

/** Query của GET /api/timesheet/days */
export class TimesheetQueryDto {
  @IsOptional() @IsString() @MaxLength(50) employeeCode?: string;
  @IsOptional() @IsString() @MaxLength(50) departmentId?: string;
  @IsOptional() @IsString() riskLevels?: string; // comma-separated
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

/** Query của GET /api/visits */
export class VisitsQueryDto {
  @IsOptional() @IsString() @MaxLength(50) employeeCode?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

/** Query của GET /api/orders */
export class OrdersQueryDto {
  @IsOptional() @IsString() @MaxLength(50) employeeCode?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

/** Query của GET /api/audit */
export class AuditQueryDto {
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

/** Query của GET /api/ai/runs */
export class AiRunsQueryDto {
  @IsOptional() @IsString() limit?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
}

/** Body của POST /api/ai/timesheet/analyze */
export class AiAnalyzeDto {
  @IsString()
  @MaxLength(10)
  startDate!: string;

  @IsString()
  @MaxLength(10)
  endDate!: string;
}

/** Body của POST /api/sync/run + /api/mobiwork/preview */
export class SyncDto {
  @IsString()
  @MaxLength(200)
  endpoint!: string;

  @IsString()
  @MaxLength(10)
  startDate!: string;

  @IsString()
  @MaxLength(10)
  endDate!: string;
}

/** Body của POST /api/vision/analyze */
export class VisionAnalyzeDto {
  @IsString()
  @MaxLength(2000)
  imageUrl!: string;

  @IsOptional() @IsString() @MaxLength(50) employeeCode?: string;
  @IsOptional() @IsString() @MaxLength(10) date?: string;
  @IsOptional() @IsString() @MaxLength(20) checkType?: string;
  @IsOptional() @IsString() @MaxLength(500) locationText?: string;
}

/** Body của POST /api/timesheet/evaluate (single day re-evaluate) */
export class TimesheetEvaluateDto {
  @IsOptional() @IsString() @MaxLength(10) date?: string;
}

/** Body của POST /api/timesheet/export */
export class TimesheetExportDto {
  @IsOptional() @IsString() @MaxLength(10) startDate?: string;
  @IsOptional() @IsString() @MaxLength(10) endDate?: string;
}

/** Body của POST /api/orders/:id/approve + /reject */
export class OrderDecisionDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Body của PATCH /api/settings.
 *  Dùng @Allow() + whitelist @IsXxx() decorators:
 *  - Field khai báo trong DTO mới được phép
 *  - Field lạ sẽ bị ValidationPipe với `whitelist+forbidNonWhitelisted` chặn
 *  - Field nào không required thì @IsOptional()
 *
 *  Lưu ý: KHÔNG có field nào cho secret ở đây (JWT_SECRET, AI_API_KEY, etc.)
 *  vì những field đó không bao giờ được ghi qua API. Chúng từ env/secret manager. */
export class UpdateSettingsDto {
  // --- Shift & timezone ---
  @IsOptional() @IsString() @MaxLength(10) shiftStart?: string;
  @IsOptional() @IsString() @MaxLength(10) lateAfter?: string;
  @IsOptional() @IsString() @MaxLength(10) shiftEnd?: string;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(24)
  minWorkHours?: number;
  @IsOptional() @IsString() @MaxLength(50) timezone?: string;

  // --- AI Provider ---
  @IsOptional() @IsIn(["openai", "9router"]) aiProvider?: string;
  @IsOptional() @IsString() @MaxLength(500) aiBaseUrl?: string;
  @IsOptional() @IsIn(["openai", "responses"]) aiWireApi?: string;
  /** Empty string = giữ nguyên giá trị cũ. Có giá trị thật = update. */
  @IsOptional() @IsString() @MaxLength(2000) aiApiKey?: string;
  @IsOptional() @IsString() @MaxLength(200) aiTextModel?: string;
  @IsOptional() @IsString() @MaxLength(200) aiVisionModel?: string;
  @IsOptional() @IsIn(["low", "medium", "high"]) aiReasoningEffort?: string;
  @IsOptional() @IsIn(["low", "medium", "high"]) aiVerbosity?: string;

  // --- Mobiwork ---
  @IsOptional() @IsString() @MaxLength(500) mobiworkApiBase?: string;
  @IsOptional() @IsString() @MaxLength(200) mobiworkUserId?: string;
  /** Empty string = giữ nguyên. Có giá trị = update. */
  @IsOptional() @IsString() @MaxLength(2000) mobiworkToken?: string;

  // --- Vision toggle ---
  @IsOptional() @IsBoolean() visionEnabled?: boolean;

  // --- Rule weights (0-100 điểm) ---
  @IsOptional() @IsNumber() @Min(0) @Max(100) missingCheckInPenalty?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) missingCheckOutPenalty?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  lateMinutePenaltyMultiplier?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) lateMaxPenalty?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  earlyLeaveMinutePenaltyMultiplier?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) earlyLeaveMaxPenalty?: number;
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  underHoursPenaltyMultiplier?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) underHoursMaxPenalty?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) tooManyEventsPenalty?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) duplicateEventPenalty?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) noVisitPenalty?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) lowOnRouteRatePenalty?: number;
}
