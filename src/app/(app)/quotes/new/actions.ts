"use server";

import { redirect } from "next/navigation";
import { errorMessage, fail, type ActionResult } from "@/lib/action-result";
import { requireTenant } from "@/server/auth/session";
import { generateDraft, QuoteServiceError } from "@/server/services/quote-service";

export async function createDraft(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const tenant = await requireTenant();
  let quoteId: string;
  try {
    quoteId = await generateDraft(tenant, String(formData.get("enquiry") ?? ""));
  } catch (error) {
    return fail(errorMessage(error, [QuoteServiceError]));
  }
  redirect(`/quotes/${quoteId}`);
}
