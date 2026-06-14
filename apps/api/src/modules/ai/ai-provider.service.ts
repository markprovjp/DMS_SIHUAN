import { Injectable, Logger } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service";
import {
  AiProvider,
  AiTextRequest,
  AiVisionRequest,
  AiProviderResult,
} from "./ai-provider.interface";
import { ResponsesApiProvider } from "./providers/responses-api.provider";
import { OpenAiCompatibleProvider } from "./providers/openai-compatible.provider";

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(private readonly settingsService: SettingsService) {}

  private async getProvider(): Promise<AiProvider> {
    const settings = await this.settingsService.getAll();

    const providerType =
      process.env.AI_PROVIDER || settings["aiProvider"] || "9router";
    const baseUrl =
      process.env.AI_BASE_URL ||
      settings["aiBaseUrl"] ||
      "https://qrouter.online/v1";
    const wireApi =
      process.env.AI_WIRE_API || settings["aiWireApi"] || "responses";

    const apiKey =
      process.env.AI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      settings["aiApiKey"] ||
      settings["openaiApiKey"] ||
      "";

    if (
      !apiKey ||
      apiKey === "replace_with_gateway_key" ||
      apiKey === "your_openai_api_key_here"
    ) {
      this.logger.warn("AI API key is missing or set to placeholder value.");
    }

    if (providerType === "9router" || wireApi === "responses") {
      return new ResponsesApiProvider(baseUrl, apiKey);
    } else {
      // standard openai / other compatible gateway
      return new OpenAiCompatibleProvider(baseUrl, apiKey);
    }
  }

  async analyzeText<T>(request: AiTextRequest): Promise<AiProviderResult<T>> {
    const provider = await this.getProvider();

    // Dynamic settings extraction: default model cx/gpt-5.5
    const settings = await this.settingsService.getAll();
    const defaultModel =
      process.env.AI_TEXT_MODEL ||
      process.env.OPENAI_TEXT_MODEL ||
      settings["aiTextModel"] ||
      settings["openaiTextModel"] ||
      "cx/gpt-5.5";
    const reasoningEffort = (process.env.AI_REASONING_EFFORT ||
      settings["aiReasoningEffort"] ||
      "high") as any;
    const verbosity = (process.env.AI_VERBOSITY ||
      settings["aiVerbosity"] ||
      "medium") as any;

    const requestWithDefaults: AiTextRequest = {
      ...request,
      model: request.model || defaultModel,
      reasoningEffort: request.reasoningEffort || reasoningEffort,
      verbosity: request.verbosity || verbosity,
    };

    return provider.analyzeText<T>(requestWithDefaults);
  }

  async analyzeImage<T>(
    request: AiVisionRequest,
  ): Promise<AiProviderResult<T>> {
    const provider = await this.getProvider();

    const settings = await this.settingsService.getAll();
    const defaultModel =
      process.env.AI_VISION_MODEL ||
      process.env.OPENAI_VISION_MODEL ||
      settings["aiVisionModel"] ||
      settings["openaiVisionModel"] ||
      "cx/gpt-5.5";

    const requestWithDefaults: AiVisionRequest = {
      ...request,
      model: request.model || defaultModel,
    };

    return provider.analyzeImage<T>(requestWithDefaults);
  }
}
