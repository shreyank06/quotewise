import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AiError, type StructuredModel, type StructuredRequest } from "./provider";

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError)
    return new AiError("auth", "The Anthropic API key was rejected. Check it on the Settings page.");
  if (error instanceof Anthropic.RateLimitError) return new AiError("rate_limit", "Anthropic rate limit hit. Try again in a minute.");
  if (error instanceof Anthropic.BadRequestError) return new AiError("bad_request", `Anthropic rejected the request: ${error.message}`);
  if (error instanceof Anthropic.APIError) return new AiError("unavailable", `Anthropic API error (${error.status ?? "network"}).`);
  return new AiError("unavailable", "Couldn't reach Anthropic.");
}

export function createAnthropicModel(apiKey: string, model: string): StructuredModel {
  // A fresh client per call: the key belongs to one company and must never be shared or cached globally.
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });

  return {
    async generate<T>({ system, user, schema }: StructuredRequest<T>): Promise<T> {
      try {
        const response = await client.beta.messages.parse({
          model,
          max_tokens: 16000,
          system,
          messages: [{ role: "user", content: user }],
          output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
          // Server-side fallback re-runs the request on another model if this one declines.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
        if (response.stop_reason === "refusal") throw new AiError("refusal", "The model declined to process this enquiry.");
        if (response.stop_reason === "max_tokens") throw new AiError("invalid_output", "The model's answer was cut off.");
        if (!response.parsed_output) throw new AiError("invalid_output", "The model's answer didn't match the expected format.");
        return response.parsed_output as T;
      } catch (error) {
        throw toAiError(error);
      }
    },

    async verify() {
      try {
        await client.models.retrieve(model);
      } catch (error) {
        if (error instanceof Anthropic.NotFoundError) throw new AiError("bad_request", `Model "${model}" isn't available on this key.`);
        throw toAiError(error);
      }
    },
  };
}
