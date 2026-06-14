import { Logger } from "@nestjs/common";
import {
  AiProvider,
  AiTextRequest,
  AiVisionRequest,
  AiProviderResult,
} from "../ai-provider.interface";

export class ResponsesApiProvider implements AiProvider {
  private readonly logger = new Logger(ResponsesApiProvider.name);

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private getCleanUrl(): string {
    const base = this.baseUrl.replace(/\/$/, "");
    return `${base}/responses`;
  }

  private getSafeHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer [MASKED]",
    };
  }

  async analyzeText<T>(request: AiTextRequest): Promise<AiProviderResult<T>> {
    const url = this.getCleanUrl();

    // Extract schema name from jsonSchema if possible, otherwise use default
    const schemaName =
      (request.jsonSchema as any)?.name || "ai_analysis_output";

    // Normalize nested JSON Schema formats
    const schema = (request.jsonSchema as any).schema ?? request.jsonSchema;

    const payload = {
      model: request.model || "cx/gpt-5.5",
      reasoning: {
        effort: request.reasoningEffort || "high",
      },
      text: {
        verbosity: request.verbosity || "medium",
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: schema,
        },
      },
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: request.system }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: request.user }],
        },
      ],
    };

    this.logger.log(
      `Calling Responses API (Text) at ${url} with model ${payload.model}. Headers: ${JSON.stringify(this.getSafeHeaders())}`,
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Responses API error (${response.status}): ${errorText}`,
        );
        throw new Error(
          `Responses API failed with status ${response.status}: ${errorText}`,
        );
      }

      const rawResponse = await this.readResponseBody(response);
      return this.parseResponse<T>(rawResponse, payload.model);
    } catch (error: any) {
      this.logger.error(`Failed to call Responses API: ${error.message}`);
      throw error;
    }
  }

  async analyzeImage<T>(
    request: AiVisionRequest,
  ): Promise<AiProviderResult<T>> {
    const url = this.getCleanUrl();
    const schemaName = (request.jsonSchema as any)?.name || "vision_output";

    // Normalize nested JSON Schema formats
    const schema = (request.jsonSchema as any).schema ?? request.jsonSchema;

    const payload = {
      model: request.model || "cx/gpt-5.5",
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: schema,
        },
      },
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: request.system }],
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: request.user },
            { type: "input_image", image_url: request.imageUrl },
          ],
        },
      ],
    };

    this.logger.log(
      `Calling Responses API (Vision) at ${url} with model ${payload.model}. Headers: ${JSON.stringify(this.getSafeHeaders())}`,
    );

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Responses API Vision error (${response.status}): ${errorText}`,
        );
        throw new Error(
          `Responses API Vision failed with status ${response.status}: ${errorText}`,
        );
      }

      const rawResponse = await this.readResponseBody(response);
      return this.parseResponse<T>(rawResponse, payload.model);
    } catch (error: any) {
      this.logger.error(
        `Failed to call Responses API Vision: ${error.message}`,
      );
      throw error;
    }
  }

  private parseResponse<T>(
    raw: any,
    defaultModel: string,
  ): AiProviderResult<T> {
    let content = "";

    // 1. Direct output_text at root
    if (raw && typeof raw.output_text === "string") {
      content = raw.output_text;
    }
    // 2. output as a raw string
    else if (raw && typeof raw.output === "string") {
      content = raw.output;
    }
    // 3. output as an array (real Responses API array format)
    else if (raw && Array.isArray(raw.output)) {
      for (const item of raw.output) {
        if (item && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (
              part &&
              part.type === "output_text" &&
              typeof part.text === "string"
            ) {
              content += part.text;
            }
          }
        }
      }
    }
    // 4. choices structure (OpenAI structure inside or outside output)
    else if (raw) {
      const root = raw.output ? raw.output : raw;
      if (root.choices && root.choices.length > 0) {
        content = root.choices[0].message?.content || "";
      } else if (root.text) {
        content =
          typeof root.text === "string" ? root.text : JSON.stringify(root.text);
      }
    }

    if (!content) {
      throw new Error(
        `Invalid response format from Responses API. Response: ${JSON.stringify(raw)}`,
      );
    }

    let parsedOutput: T;
    try {
      parsedOutput = JSON.parse(content) as T;
    } catch (e) {
      // In case the response is not valid JSON string but OpenAI returned structured object directly
      if (typeof content === "object") {
        parsedOutput = content as unknown as T;
      } else {
        throw new Error(
          `Failed to parse AI output content as JSON: ${content}`,
        );
      }
    }

    const usageSource =
      raw.output && !Array.isArray(raw.output) && raw.output.usage
        ? raw.output
        : raw;
    const usage = usageSource.usage
      ? {
          inputTokens: usageSource.usage.prompt_tokens,
          outputTokens: usageSource.usage.completion_tokens,
          totalTokens: usageSource.usage.total_tokens,
        }
      : undefined;

    const modelSource =
      raw.output && !Array.isArray(raw.output) && raw.output.model
        ? raw.output
        : raw;
    const model = modelSource.model || defaultModel;

    return {
      output: parsedOutput,
      raw,
      usage,
      model,
      provider: "9router",
    };
  }

  private async readResponseBody(response: Response): Promise<any> {
    if (typeof (response as any).text !== "function") {
      return (response as any).json();
    }

    const contentType = response.headers?.get("content-type") || "";
    const bodyText = await response.text();

    if (
      contentType.includes("text/event-stream") ||
      bodyText.startsWith("event:")
    ) {
      return this.parseSseResponse(bodyText);
    }

    return JSON.parse(bodyText);
  }

  private parseSseResponse(bodyText: string): any {
    let completedResponse: any;
    let outputText = "";

    for (const line of bodyText.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      let eventData: any;
      try {
        eventData = JSON.parse(data);
      } catch {
        continue;
      }

      if (eventData.type === "response.completed" && eventData.response) {
        completedResponse = eventData.response;
      } else if (
        eventData.type === "response.output_text.delta" &&
        typeof eventData.delta === "string"
      ) {
        outputText += eventData.delta;
      } else if (
        eventData.type === "response.output_text.done" &&
        typeof eventData.text === "string"
      ) {
        outputText = eventData.text;
      }
    }

    return completedResponse || { output_text: outputText };
  }
}
