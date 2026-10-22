"use server";

import { revalidatePath } from "next/cache";
import { errorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireTenant } from "@/server/auth/session";
import { deleteCredential } from "@/server/repos/credentials";
import { CredentialError, saveVerifiedCredential } from "@/server/services/credential-service";

export async function saveApiKey(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const tenant = await requireTenant();
  try {
    await saveVerifiedCredential(tenant.companyId, tenant.userId, {
      provider: formData.get("provider"),
      model: formData.get("model") ?? "",
      apiKey: formData.get("apiKey"),
    });
  } catch (error) {
    // Provider errors are already phrased for the user and never contain the key.
    return fail(errorMessage(error, [CredentialError]));
  }
  revalidatePath("/settings");
  return ok("Key checked with the provider and saved.");
}

export async function removeApiKey(): Promise<void> {
  const tenant = await requireTenant();
  await deleteCredential(tenant.companyId);
  revalidatePath("/settings");
}
