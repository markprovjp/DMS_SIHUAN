import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const list = await this.prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const item of list) {
      result[item.key] = item.value;
    }
    return result;
  }

  private getEnvironmentSettings(): Record<string, string> {
    const envMap: Record<string, string | undefined> = {
      mobiworkApiBase: process.env.MOBIWORK_API_BASE,
      mobiworkUserId: process.env.MOBIWORK_USER_ID,
      mobiworkToken: process.env.MOBIWORK_TOKEN,
      aiProvider: process.env.AI_PROVIDER,
      aiBaseUrl: process.env.AI_BASE_URL,
      aiWireApi: process.env.AI_WIRE_API,
      aiApiKey: process.env.AI_API_KEY,
      aiTextModel: process.env.AI_TEXT_MODEL,
      aiVisionModel: process.env.AI_VISION_MODEL,
      aiReasoningEffort: process.env.AI_REASONING_EFFORT,
      aiVerbosity: process.env.AI_VERBOSITY,
    };

    return Object.fromEntries(
      Object.entries(envMap).filter(([, value]) => !!value),
    ) as Record<string, string>;
  }

  private isSensitiveKey(key: string): boolean {
    return /ApiKey|token|password|secret|userId/i.test(key);
  }

  async getAllMasked() {
    const list = {
      ...(await this.getAll()),
      ...this.getEnvironmentSettings(),
    };
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(list)) {
      if (this.isSensitiveKey(key)) {
        const hasValue = !!value && value !== "";
        let masked = "";
        if (hasValue) {
          masked = value.length > 4 ? `****${value.slice(-4)}` : "********";
        }
        result[key] = {
          configured: hasValue,
          masked: hasValue ? masked : "",
        };
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  async get(key: string, defaultValue = ""): Promise<string> {
    const item = await this.prisma.setting.findUnique({
      where: { key },
    });
    return item ? item.value : defaultValue;
  }

  async update(key: string, value: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async updateMany(settings: Record<string, any>) {
    const promises = Object.entries(settings).map(async ([key, value]) => {
      if (this.isSensitiveKey(key)) {
        if (typeof value === "object" && value !== null) {
          // If frontend sends the object directly without modifications, skip updating
          return;
        }
        const stringValue = String(value);
        if (stringValue === "********" || stringValue.startsWith("****")) {
          // Skip updating if it's the masked value
          return;
        }
        return this.update(key, stringValue);
      }

      const stringValue =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      return this.update(key, stringValue);
    });
    await Promise.all(promises);
    return this.getAllMasked();
  }
}
