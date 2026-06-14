import { describe, test, expect, vi, beforeEach } from "vitest";
import { ResponsesApiProvider } from "../providers/responses-api.provider";
import { OpenAiCompatibleProvider } from "../providers/openai-compatible.provider";
import { OpenAI } from "openai";

// Mock OpenAI
vi.mock("openai", () => {
  const mockChatCreate = vi.fn();
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCreate,
        },
      },
    })),
  };
});

describe("AI Providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ResponsesApiProvider (9Router)", () => {
    test("targets responses endpoint with correct payload and headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  executiveSummary: "Hello from 9Router",
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
          model: "cx/gpt-5.5",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = new ResponsesApiProvider(
        "https://qrouter.online/v1",
        "my-secret-key",
      );
      const result = await provider.analyzeText<any>({
        system: "System prompt",
        user: "User prompt",
        jsonSchema: { name: "test_schema", type: "object" },
        model: "cx/gpt-5.5",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://qrouter.online/v1/responses",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer my-secret-key",
          },
        }),
      );

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(sentBody.model).toBe("cx/gpt-5.5");
      expect(sentBody.text.format.type).toBe("json_schema");
      expect(sentBody.input[0].content[0].text).toBe("System prompt");
      expect(sentBody.input[1].content[0].text).toBe("User prompt");

      expect(result.output.executiveSummary).toBe("Hello from 9Router");
      expect(result.usage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      });
      expect(result.provider).toBe("9router");
    });

    test("handles real Responses API output_text string format", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_text: JSON.stringify({
            executiveSummary: "Output text direct from Responses API",
          }),
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40,
          },
          model: "cx/gpt-5.5",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = new ResponsesApiProvider(
        "https://qrouter.online/v1",
        "my-secret-key",
      );
      const result = await provider.analyzeText<any>({
        system: "System prompt",
        user: "User prompt",
        jsonSchema: { name: "test_schema", type: "object" },
        model: "cx/gpt-5.5",
      });

      expect(result.output.executiveSummary).toBe(
        "Output text direct from Responses API",
      );
      expect(result.usage).toEqual({
        inputTokens: 15,
        outputTokens: 25,
        totalTokens: 40,
      });
    });

    test("handles real Responses API array with output_text type format", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    executiveSummary: "Hello from nested content array",
                  }),
                },
              ],
            },
          ],
          usage: {
            prompt_tokens: 18,
            completion_tokens: 28,
            total_tokens: 46,
          },
          model: "cx/gpt-5.5",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = new ResponsesApiProvider(
        "https://qrouter.online/v1",
        "my-secret-key",
      );
      const result = await provider.analyzeText<any>({
        system: "System prompt",
        user: "User prompt",
        jsonSchema: { name: "test_schema", type: "object" },
        model: "cx/gpt-5.5",
      });

      expect(result.output.executiveSummary).toBe(
        "Hello from nested content array",
      );
      expect(result.usage).toEqual({
        inputTokens: 18,
        outputTokens: 28,
        totalTokens: 46,
      });
    });

    test("handles 9Router text/event-stream Responses output", async () => {
      const completed = {
        type: "response.completed",
        response: {
          output: [
            {
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    executiveSummary: "Hello from SSE",
                  }),
                },
              ],
            },
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 8,
            total_tokens: 20,
          },
          model: "cx/gpt-5.5",
        },
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/event-stream" }),
        text: async () =>
          [
            "event: response.created",
            'data: {"type":"response.created"}',
            "event: response.output_text.delta",
            'data: {"type":"response.output_text.delta","delta":"{\\"executiveSummary\\":\\"Hello"}',
            "event: response.completed",
            `data: ${JSON.stringify(completed)}`,
            "",
          ].join("\n"),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = new ResponsesApiProvider(
        "https://qrouter.online/v1",
        "my-secret-key",
      );
      const result = await provider.analyzeText<any>({
        system: "System prompt",
        user: "User prompt",
        jsonSchema: { name: "test_schema", type: "object" },
        model: "cx/gpt-5.5",
      });

      expect(result.output.executiveSummary).toBe("Hello from SSE");
      expect(result.usage).toEqual({
        inputTokens: 12,
        outputTokens: 8,
        totalTokens: 20,
      });
    });

    test("normalizes nested JSON Schema structures correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output_text: JSON.stringify({ success: true }),
          model: "cx/gpt-5.5",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const provider = new ResponsesApiProvider(
        "https://qrouter.online/v1",
        "my-secret-key",
      );

      // Pass an outer wrapper schema representation
      const wrappedSchema = {
        name: "wrapped_schema",
        strict: true,
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
          },
          required: ["success"],
        },
      };

      await provider.analyzeText<any>({
        system: "System prompt",
        user: "User prompt",
        jsonSchema: wrappedSchema as any,
        model: "cx/gpt-5.5",
      });

      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Ensure the text.format.schema is just the pure schema property, not the outer wrapper
      expect(sentBody.text.format.schema).toEqual({
        type: "object",
        properties: {
          success: { type: "boolean" },
        },
        required: ["success"],
      });
    });
  });

  describe("OpenAiCompatibleProvider", () => {
    test("calls openai SDK chat.completions.create with proper parameters", async () => {
      const openAiInstance = new OpenAI({ apiKey: "test" }) as any;
      openAiInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                executiveSummary: "Hello from OpenAI",
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 25,
          total_tokens: 40,
        },
        model: "gpt-4o-mini",
      });

      const provider = new OpenAiCompatibleProvider(
        "https://api.openai.com/v1",
        "my-openai-key",
      );
      const result = await provider.analyzeText<any>({
        system: "System prompt",
        user: "User prompt",
        jsonSchema: { name: "test_schema", type: "object" },
        model: "gpt-4o-mini",
      });

      expect(openAiInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "System prompt" },
            { role: "user", content: "User prompt" },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "test_schema",
              strict: true,
              schema: { name: "test_schema", type: "object" },
            },
          },
        }),
      );

      expect(result.output.executiveSummary).toBe("Hello from OpenAI");
      expect(result.usage).toEqual({
        inputTokens: 15,
        outputTokens: 25,
        totalTokens: 40,
      });
      expect(result.provider).toBe("openai-compatible");
    });

    test("normalizes nested JSON Schema structures correctly", async () => {
      const openAiInstance = new OpenAI({ apiKey: "test" }) as any;
      openAiInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({ success: true }),
            },
          },
        ],
        model: "gpt-4o-mini",
      });

      const provider = new OpenAiCompatibleProvider(
        "https://api.openai.com/v1",
        "my-openai-key",
      );

      // Pass an outer wrapper schema representation
      const wrappedSchema = {
        name: "wrapped_schema",
        strict: true,
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
          },
          required: ["success"],
        },
      };

      await provider.analyzeText<any>({
        system: "System prompt",
        user: "User prompt",
        jsonSchema: wrappedSchema as any,
        model: "gpt-4o-mini",
      });

      expect(openAiInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "wrapped_schema",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                },
                required: ["success"],
              },
            },
          },
        }),
      );
    });
  });
});
