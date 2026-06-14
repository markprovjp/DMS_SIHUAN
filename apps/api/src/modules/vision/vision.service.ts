import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { SettingsService } from "../settings/settings.service";
import { AiProviderService } from "../ai/ai-provider.service";
import {
  AI_VISION_SYSTEM_PROMPT,
  AI_VISION_USER_PROMPT_TEMPLATE,
  VisionOutputSchema,
  VisionOutput,
} from "@dms-admin/ai-prompts";
import { ImageClassification } from "@prisma/client";

const VisionOutputJsonSchema = {
  name: "vision_output",
  strict: true,
  schema: {
    type: "object",
    properties: {
      classification: {
        type: "string",
        enum: [
          "VALID_WORK_CONTEXT",
          "BLURRY_OR_UNCLEAR",
          "UNRELATED_IMAGE",
          "POSSIBLE_PRIVACY_RISK",
          "NEEDS_HUMAN_REVIEW",
        ],
      },
      confidence: { type: "number" },
      reason: { type: "string" },
      visibleIssues: { type: "array", items: { type: "string" } },
      suggestedAction: { type: ["string", "null"] },
    },
    required: [
      "classification",
      "confidence",
      "reason",
      "visibleIssues",
      "suggestedAction",
    ],
    additionalProperties: false,
  },
};

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private aiProviderService: AiProviderService,
  ) {}

  async getResults() {
    return this.prisma.visionAnalysis.findMany({
      include: {
        visit: {
          include: { employee: true, customer: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async analyzeCheckInPhoto(
    imageUrlOrVisitId: string,
    imageUrlOrContext?:
      | string
      | {
          employeeCode?: string;
          date?: string;
          checkType?: string;
          locationText?: string;
        },
  ) {
    // Support 2 calling conventions:
    // 1) (visitId, imageUrl)  - legacy
    // 2) (imageUrl, context)  - new (controller dùng DTO mới)
    let imageUrl: string;
    let visitId: string | undefined;
    let legacyContext:
      | {
          employeeCode?: string;
          date?: string;
          checkType?: string;
          locationText?: string;
        }
      | undefined;
    if (typeof imageUrlOrContext === "string") {
      visitId = imageUrlOrVisitId;
      imageUrl = imageUrlOrContext;
    } else {
      imageUrl = imageUrlOrVisitId;
      legacyContext = imageUrlOrContext;
    }
    // 1. Check if vision is enabled
    const settings = await this.settingsService.getAll();
    const isEnabled = settings["visionEnabled"] === "true";
    if (!isEnabled) {
      throw new BadRequestException(
        "Mô-đun AI Vision hiện đang tắt trong Cấu hình hệ thống.",
      );
    }

    const model =
      settings["aiVisionModel"] ||
      process.env.AI_VISION_MODEL ||
      settings["openaiVisionModel"] ||
      process.env.OPENAI_VISION_MODEL ||
      "gpt-4o";

    const visit = await this.prisma.visit.findUnique({
      where: { id: visitId },
      include: { employee: true, customer: true },
    });

    if (!visit) {
      throw new BadRequestException(
        "Không tìm thấy lượt viếng thăm tương ứng.",
      );
    }

    const context = legacyContext ?? {
      employeeCode: visit.employee.code,
      date: visit.date.toISOString().substring(0, 10),
      checkType: "Viếng thăm thực địa",
      locationText:
        visit.customer.name + " - " + (visit.customer.address || ""),
    };

    let parsed: VisionOutput | null = null;
    let attempts = 1;
    let errorMsg = "";

    const callVision = async (promptText: string) => {
      return this.aiProviderService.analyzeImage<VisionOutput>({
        system: AI_VISION_SYSTEM_PROMPT,
        user: promptText,
        imageUrl,
        jsonSchema: VisionOutputJsonSchema,
        model,
      });
    };

    try {
      const userPrompt = AI_VISION_USER_PROMPT_TEMPLATE(context);
      let response = await callVision(userPrompt);
      parsed = response.output;

      try {
        parsed = VisionOutputSchema.parse(parsed);
      } catch (valError: any) {
        attempts++;
        const correctionPrompt = `
Dữ liệu JSON trả về trước đó không khớp với schema Zod yêu cầu cho Vision.
Lỗi phân tích: ${valError.message}
Dữ liệu JSON lỗi:
${JSON.stringify(parsed)}

Hãy điều chỉnh định dạng JSON trả về sao cho khớp 100% với schema và trường bắt buộc.
`;
        response = await callVision(correctionPrompt);
        parsed = response.output;
        parsed = VisionOutputSchema.parse(parsed);
      }
    } catch (e: any) {
      this.logger.error(
        `AI Vision analysis failed after ${attempts} attempts: ${e.message}`,
      );
      errorMsg = e.message;
    }

    // 3. Save to database (either parsed output or fallback NEEDS_HUMAN_REVIEW on failure)
    const classification = parsed?.classification || "NEEDS_HUMAN_REVIEW";
    const confidence = parsed ? Number(parsed.confidence) : 0.0;
    const reason = parsed
      ? parsed.reason
      : `Phân tích ảnh thất bại: ${errorMsg}`;
    const visibleIssues = parsed
      ? parsed.visibleIssues
      : ["AI_ANALYSIS_FAILED"];

    try {
      const analysis = await this.prisma.visionAnalysis.create({
        data: {
          visitId,
          imageUrl,
          classification: classification as ImageClassification,
          confidence,
          reason,
          visibleIssues,
        },
      });

      // Get host only for safe audit logging
      const baseUrl =
        settings["aiBaseUrl"] || process.env.AI_BASE_URL || "default";
      let baseHost = "default";
      try {
        if (baseUrl && baseUrl.startsWith("http")) {
          baseHost = new URL(baseUrl).hostname;
        } else {
          baseHost = baseUrl;
        }
      } catch {
        baseHost = baseUrl;
      }

      // Save Audit log
      await this.prisma.auditLog.create({
        data: {
          action: "VISION_ANALYSIS",
          details: `Phân tích ảnh viếng thăm của nhân viên ${visit.employee.code} sử dụng Gateway (Host: ${baseHost}). Kết quả: ${classification}`,
        },
      });

      return analysis;
    } catch (dbError: any) {
      this.logger.error(`Failed to save vision analysis: ${dbError.message}`);
      throw new InternalServerErrorException(
        `Lỗi lưu kết quả phân tích: ${dbError.message}`,
      );
    }
  }

  async testVisionConnection(imageUrl: string) {
    try {
      const response = await this.aiProviderService.analyzeImage<{
        classification: string;
        reason: string;
      }>({
        system:
          "Ban chi phan loai chat luong va tinh lien quan cua anh check-in cong viec. Khong nhan dien nguoi, khong doan danh tinh, khong so sanh khuon mat. Tra ve JSON dung schema.",
        user: "Kiểm tra ảnh này.",
        imageUrl,
        jsonSchema: {
          name: "test_vision_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              classification: { type: "string" },
              reason: { type: "string" },
            },
            required: ["classification", "reason"],
            additionalProperties: false,
          },
        },
      });
      return {
        success: true,
        classification: response.output.classification,
        reason: response.output.reason,
        model: response.model,
        provider: response.provider,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
      };
    }
  }

  async analyzeTimesheetEventPhoto(eventId: string, providedImageUrl?: string) {
    // 1. Check if vision is enabled
    const settings = await this.settingsService.getAll();
    const isEnabled = settings["visionEnabled"] === "true";
    if (!isEnabled) {
      throw new BadRequestException(
        "Mô-đun AI Vision hiện đang tắt trong Cấu hình hệ thống.",
      );
    }

    const model =
      settings["aiVisionModel"] ||
      process.env.AI_VISION_MODEL ||
      settings["openaiVisionModel"] ||
      process.env.OPENAI_VISION_MODEL ||
      "cx/gpt-5.5";

    const event = await this.prisma.timesheetEvent.findUnique({
      where: { id: eventId },
      include: { timesheetDay: { include: { employee: true } } },
    });

    if (!event) {
      throw new BadRequestException(
        "Không tìm thấy sự kiện chấm công tương ứng.",
      );
    }

    // Lấy imageUrl từ event.images[0] nếu không được cung cấp trực tiếp
    const imageUrl = providedImageUrl || event.images[0];
    if (!imageUrl) {
      throw new BadRequestException("Không có hình ảnh để phân tích.");
    }

    const context = {
      employeeCode: event.timesheetDay.employee.code,
      date: event.timesheetDay.date.toISOString().substring(0, 10),
      checkType:
        event.type === "CHECKIN"
          ? "Chấm công vào (Check-in)"
          : "Chấm công ra (Check-out)",
      locationText: event.location || "Không rõ tọa độ",
    };

    let parsed: VisionOutput | null = null;
    let attempts = 1;
    let errorMsg = "";

    const callVision = async (promptText: string) => {
      return this.aiProviderService.analyzeImage<VisionOutput>({
        system: AI_VISION_SYSTEM_PROMPT,
        user: promptText,
        imageUrl,
        jsonSchema: VisionOutputJsonSchema,
        model,
      });
    };

    try {
      const userPrompt = AI_VISION_USER_PROMPT_TEMPLATE(context);
      let response = await callVision(userPrompt);
      parsed = response.output;

      try {
        parsed = VisionOutputSchema.parse(parsed);
      } catch (valError: any) {
        attempts++;
        const correctionPrompt = `
Dữ liệu JSON trả về trước đó không khớp với schema Zod yêu cầu cho Vision.
Lỗi phân tích: ${valError.message}
Dữ liệu JSON lỗi:
${JSON.stringify(parsed)}

Hãy điều chỉnh định dạng JSON trả về sao cho khớp 100% với schema và trường bắt buộc.
`;
        response = await callVision(correctionPrompt);
        parsed = response.output;
        parsed = VisionOutputSchema.parse(parsed);
      }
    } catch (e: any) {
      this.logger.error(
        `AI Vision for timesheet event failed after ${attempts} attempts: ${e.message}`,
      );
      errorMsg = e.message;
    }

    const classification = parsed?.classification || "NEEDS_HUMAN_REVIEW";
    const confidence = parsed ? Number(parsed.confidence) : 0.0;
    const reason = parsed
      ? parsed.reason
      : `Phân tích ảnh chấm công thất bại: ${errorMsg}`;
    const visibleIssues = parsed
      ? parsed.visibleIssues
      : ["AI_ANALYSIS_FAILED"];

    try {
      const analysis = await this.prisma.visionAnalysis.create({
        data: {
          timesheetEventId: eventId,
          imageUrl,
          classification: classification as ImageClassification,
          confidence,
          reason,
          visibleIssues,
        },
      });

      // Get host only for safe audit logging
      const baseUrl =
        settings["aiBaseUrl"] || process.env.AI_BASE_URL || "default";
      let baseHost = "default";
      try {
        if (baseUrl && baseUrl.startsWith("http")) {
          baseHost = new URL(baseUrl).hostname;
        } else {
          baseHost = baseUrl;
        }
      } catch {
        baseHost = baseUrl;
      }

      // Save Audit log
      await this.prisma.auditLog.create({
        data: {
          action: "VISION_ANALYSIS_TIMESHEET",
          details: `Phân tích ảnh chấm công của nhân viên ${event.timesheetDay.employee.code} sử dụng Gateway (Host: ${baseHost}). Kết quả: ${classification}`,
        },
      });

      return analysis;
    } catch (dbError: any) {
      this.logger.error(
        `Failed to save timesheet event vision analysis: ${dbError.message}`,
      );
      throw new InternalServerErrorException(
        `Lỗi lưu kết quả phân tích: ${dbError.message}`,
      );
    }
  }
}
