import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { AiError, type StructuredModel, type StructuredRequest } from "./provider";

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError)
    return new AiError("auth", "The OpenAI API key was rejected. Check it on the Settings page.");
  if (error instanceof OpenAI.RateLimitError) return new AiError("rate_limit", "OpenAI rate limit hit. Try again in a minute.");
  if (error instanceof OpenAI.BadRequestError) return new AiError("bad_request", `OpenAI rejected the request: ${error.message}`);
  if (error instanceof OpenAI.APIError) return new AiError("unavailable", `OpenAI API error (${error.status ?? "network"}).`);
  return new AiError("unavailable", "Couldn't reach OpenAI.");
}

export function createOpenAiModel(apiKey: string, model: string): StructuredModel {
  const client = new OpenAI({ apiKey, maxRetries: 2, timeout: 120_000 });

  return {
    async generate<T>({ system, user, schema, schemaName }: StructuredRequest<T>): Promise<T> {
      try {
        const completion = await client.chat.completions.parse({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: zodResponseFormat(schema, schemaName),
        });
        const message = completion.choices[0]?.message;
        if (message?.refusal) throw new AiError("refusal", "The model declined to process this enquiry.");
        if (!message?.parsed) throw new AiError("invalid_output", "The model's answer didn't match the expected format.");
        return message.parsed as T;
      } catch (error) {
        throw toAiError(error);
      }
    },

    async verify() {
      try {
        await client.models.retrieve(model);
      } catch (error) {
        if (error instanceof OpenAI.NotFoundError) throw new AiError("bad_request", `Model "${model}" isn't available on this key.`);
        throw toAiError(error);
      }
    },
  };
}
