import type { z } from "zod";

export const AI_PROVIDERS = ["anthropic", "openai"] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

export const DEFAULT_MODELS: Record<AiProviderName, string> = {
  anthropic: "claude-opus-5-5",
  openai: "gpt-5",
};

export type AiCredential = { provider: AiProviderName; apiKey: string; model: string };

export type StructuredRequest<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  schemaName: string;
};

/** Provider-neutral surface: the rest of the app never imports a vendor SDK directly. */
export interface StructuredModel {
  generate<T>(request: StructuredRequest<T>): Promise<T>;
  /** Cheap authenticated call used to validate a key when it's saved. */
  verify(): Promise<void>;
}

export type AiErrorCode = "auth" | "rate_limit" | "refusal" | "invalid_output" | "bad_request" | "unavailable";

/** Normalised error so the UI can explain what happened without leaking provider details. */
export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}
