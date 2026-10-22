import { z } from "zod";
import { AI_PROVIDERS, AiError, createModel, DEFAULT_MODELS } from "@/ai";
import { saveCredential } from "../repos/credentials";

export class CredentialError extends Error {}

export const CredentialInputSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  model: z.string().trim().max(100),
  apiKey: z.string().trim().min(20, "That doesn't look like an API key").max(500),
});

/** Validates the key against the provider before storing it, so a typo fails here, not mid-quote. */
export async function saveVerifiedCredential(companyId: string, userId: string, input: unknown): Promise<void> {
  const parsed = CredentialInputSchema.parse(input);
  const credential = { ...parsed, model: parsed.model || DEFAULT_MODELS[parsed.provider] };
  try {
    await createModel(credential).verify();
  } catch (error) {
    if (error instanceof AiError) throw new CredentialError(error.message);
    throw error;
  }
  await saveCredential(companyId, userId, credential);
}
