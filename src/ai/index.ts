import { createAnthropicModel } from "./anthropic";
import { createOpenAiModel } from "./openai";
import type { AiCredential, StructuredModel } from "./provider";

export * from "./provider";

export function createModel({ provider, apiKey, model }: AiCredential): StructuredModel {
  switch (provider) {
    case "anthropic":
      return createAnthropicModel(apiKey, model);
    case "openai":
      return createOpenAiModel(apiKey, model);
  }
}
