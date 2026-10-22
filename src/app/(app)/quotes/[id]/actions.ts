"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { errorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireTenant } from "@/server/auth/session";
import { approveQuote, discardQuote, QuoteServiceError, saveQuoteEdits } from "@/server/services/quote-service";

const QuoteId = z.string().uuid();

async function run(quoteId: string, work: (id: string) => Promise<void>, success: string): Promise<ActionResult> {
  const id = QuoteId.safeParse(quoteId);
  if (!id.success) return fail("Quote not found.");
  try {
    await work(id.data);
  } catch (error) {
    return fail(errorMessage(error, [QuoteServiceError]));
  }
  revalidatePath(`/quotes/${id.data}`);
  revalidatePath("/quotes");
  return ok(success);
}

export async function saveQuote(quoteId: string, edit: unknown): Promise<ActionResult> {
  const tenant = await requireTenant();
  return run(quoteId, (id) => saveQuoteEdits(tenant, id, edit), "Draft saved.");
}

/** Saves the reviewer's latest edits and approves in one step, so what they saw is what's approved. */
export async function saveAndApproveQuote(quoteId: string, edit: unknown): Promise<ActionResult> {
  const tenant = await requireTenant();
  return run(
    quoteId,
    async (id) => {
      await saveQuoteEdits(tenant, id, edit);
      await approveQuote(tenant, id);
    },
    "Approved. Copy the quote below to send it.",
  );
}

export async function discard(quoteId: string): Promise<ActionResult> {
  const tenant = await requireTenant();
  return run(quoteId, (id) => discardQuote(tenant, id), "Discarded.");
}
