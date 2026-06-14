export type AiTextRequest = {
  system: string;
  user: string;
  jsonSchema: unknown;
  model?: string;
  reasoningEffort?: "low" | "medium" | "high";
  verbosity?: "low" | "medium" | "high";
};

export type AiVisionRequest = {
  system: string;
  user: string;
  imageUrl: string;
  jsonSchema: unknown;
  model?: string;
};

export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AiProviderResult<T> = {
  output: T;
  raw: unknown;
  usage?: AiUsage;
  model: string;
  provider: string;
};

export interface AiProvider {
  analyzeText<T>(request: AiTextRequest): Promise<AiProviderResult<T>>;
  analyzeImage<T>(request: AiVisionRequest): Promise<AiProviderResult<T>>;
}
