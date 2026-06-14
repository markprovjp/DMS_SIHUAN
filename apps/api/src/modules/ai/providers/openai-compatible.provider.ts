import { Logger } from "@nestjs/common";
import { OpenAI } from "openai";
import {
  AiProvider,
  AiTextRequest,
  AiVisionRequest,
  AiProviderResult,
} from "../ai-provider.interface";

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl || undefined,
    });
  }

  private getSafeHeaders(): Record<string, string> {
    return {
      Authorization: "Bearer [MASKED]",
      BaseURL: this.baseUrl || "default-openai",
    };
  }

  async analyzeText<T>(request: AiTextRequest): Promise<AiProviderResult<T>> {
    const model = request.model || "gpt-4o-mini";
    const schemaName =
      (request.jsonSchema as any)?.name || "ai_analysis_output";

    // Normalize nested JSON Schema formats
    const schema = (request.jsonSchema as any).schema ?? request.jsonSchema;

    this.logger.log(
      `Calling OpenAI Compatible API (Text) with model ${model}. Config: ${JSON.stringify(this.getSafeHeaders())}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema: schema as any,
          },
        },
        temperature: 0.2,
      });

      const rawContent = response.choices[0].message.content || "{}";
      const parsedOutput = JSON.parse(rawContent) as T;

      const usage = response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      return {
        output: parsedOutput,
        raw: response,
        usage,
        model: response.model || model,
        provider: "openai-compatible",
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to call OpenAI Compatible API: ${error.message}`,
      );
      throw error;
    }
  }

  async analyzeImage<T>(
    request: AiVisionRequest,
  ): Promise<AiProviderResult<T>> {
    const model = request.model || "gpt-4o";
    const schemaName = (request.jsonSchema as any)?.name || "vision_output";

    // Normalize nested JSON Schema formats
    const schema = (request.jsonSchema as any).schema ?? request.jsonSchema;

    this.logger.log(
      `Calling OpenAI Compatible API (Vision) with model ${model}. Config: ${JSON.stringify(this.getSafeHeaders())}`,
    );

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: request.system },
          {
            role: "user",
            content: [
              { type: "text", text: request.user },
              { type: "image_url", image_url: { url: request.imageUrl } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: true,
            schema: schema as any,
          },
        },
        temperature: 0.1,
      });

      const rawContent = response.choices[0].message.content || "{}";
      const parsedOutput = JSON.parse(rawContent) as T;

      const usage = response.usage
        ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      return {
        output: parsedOutput,
        raw: response,
        usage,
        model: response.model || model,
        provider: "openai-compatible",
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to call OpenAI Compatible API Vision: ${error.message}`,
      );
      throw error;
    }
  }
}
