import { eq } from "drizzle-orm";
import type { AiCredential, AiProviderName } from "@/ai/provider";
import { decryptSecret, encryptSecret, secretHint } from "../crypto";
import { db } from "../db/client";
import { aiCredentials } from "../db/schema";

/** Safe to send to the browser: never includes the key itself. */
export type CredentialSummary = { provider: AiProviderName; model: string; keyHint: string; updatedAt: Date };

export async function getCredentialSummary(companyId: string): Promise<CredentialSummary | null> {
  const [row] = await db
    .select({ provider: aiCredentials.provider, model: aiCredentials.model, keyHint: aiCredentials.keyHint, updatedAt: aiCredentials.updatedAt })
    .from(aiCredentials)
    .where(eq(aiCredentials.companyId, companyId))
    .limit(1);
  return row ?? null;
}

/** Server-only: decrypts the key just before an AI call. */
export async function getCredential(companyId: string): Promise<AiCredential | null> {
  const [row] = await db.select().from(aiCredentials).where(eq(aiCredentials.companyId, companyId)).limit(1);
  if (!row) return null;
  return { provider: row.provider, model: row.model, apiKey: decryptSecret(row.encryptedKey, companyId) };
}

export async function saveCredential(companyId: string, userId: string, credential: AiCredential): Promise<void> {
  const values = {
    provider: credential.provider,
    model: credential.model,
    encryptedKey: encryptSecret(credential.apiKey, companyId),
    keyHint: secretHint(credential.apiKey),
    updatedAt: new Date(),
    updatedBy: userId,
  };
  await db
    .insert(aiCredentials)
    .values({ companyId, ...values })
    .onConflictDoUpdate({ target: aiCredentials.companyId, set: values });
}

export async function deleteCredential(companyId: string): Promise<void> {
  await db.delete(aiCredentials).where(eq(aiCredentials.companyId, companyId));
}
