import { z } from "zod";
import { AiError, createModel } from "@/ai";
import { buildQuoteUserPrompt, QUOTE_SYSTEM_PROMPT } from "@/ai/quote-prompt";
import { matchCustomer } from "@/core/customer-match";
import { parseEnquiryHeaders } from "@/core/enquiry";
import { priceQuote } from "@/core/pricing";
import { buildDraftQuote } from "@/core/quote-builder";
import { QuoteExtractionSchema } from "@/core/quote-schema";
import type { TenantContext } from "../auth/session";
import { getCompany } from "../repos/companies";
import { getCredential } from "../repos/credentials";
import { createCustomer, getCustomer, listCustomers } from "../repos/customers";
import { createQuote, getQuote, linkCustomer, saveDraftLines, setQuoteStatus } from "../repos/quotes";
import { listPriceableRates } from "../repos/rates";

export class QuoteServiceError extends Error {}

export const MAX_ENQUIRY_CHARS = 20_000;

/** Enquiry in, draft out. The model reads; code prices; nothing is approved here. */
export async function generateDraft(tenant: TenantContext, enquiry: string): Promise<string> {
  const text = enquiry.trim();
  if (text.length < 20) throw new QuoteServiceError("Paste the full customer enquiry.");
  if (text.length > MAX_ENQUIRY_CHARS) throw new QuoteServiceError("That enquiry is too long to process in one go.");

  const credential = await getCredential(tenant.companyId);
  if (!credential) throw new QuoteServiceError("Add your company's AI API key on the Settings page first.");

  const [company, rates, customerList] = await Promise.all([
    getCompany(tenant.companyId),
    listPriceableRates(tenant.companyId),
    listCustomers(tenant.companyId),
  ]);
  if (rates.length === 0) throw new QuoteServiceError("There are no active rates yet. Import or confirm your price list first.");

  let extraction;
  try {
    extraction = await createModel(credential).generate({
      system: QUOTE_SYSTEM_PROMPT,
      user: buildQuoteUserPrompt(company, rates, text),
      schema: QuoteExtractionSchema,
      schemaName: "quote_extraction",
    });
  } catch (error) {
    if (error instanceof AiError) throw new QuoteServiceError(error.message);
    throw error;
  }

  const draft = buildDraftQuote({ enquiry: text, extraction, rates, policy: company.policy });

  // Header first (deterministic), then whatever the model read from the body as a fallback.
  const headers = parseEnquiryHeaders(text);
  const match =
    matchCustomer({ email: headers.fromEmail, name: headers.fromName }, customerList) ??
    matchCustomer({ email: extraction.customer.email, name: extraction.customer.organisation ?? extraction.customer.name }, customerList);

  return createQuote(
    tenant.companyId,
    {
      customerId: match?.customerId ?? null,
      customerMatchReason: match ? `${match.confidence === "exact" ? "Matched" : "Possible match"}: ${match.reason}` : null,
      outcome: draft.outcome,
      enquiryText: text,
      senderEmail: headers.fromEmail ?? extraction.customer.email,
      senderName: headers.fromName ?? extraction.customer.name,
      subject: headers.subject,
      jobSummary: extraction.jobSummary,
      flags: draft.flags,
      measurements: draft.measurements,
      extraction,
      aiProvider: credential.provider,
      aiModel: credential.model,
      createdBy: tenant.userId,
    },
    draft.totals,
  );
}

export const QuoteEditSchema = z.object({
  reviewerNotes: z.string().max(5000),
  customerId: z.string().uuid().nullable(),
  lines: z
    .array(
      z.object({
        id: z.string().nullable(),
        rateCode: z.string().max(20).nullable(),
        description: z.string().trim().min(1).max(300),
        unit: z.string().trim().min(1).max(20),
        quantity: z.number().positive().max(100_000),
        unitPricePence: z.number().int().min(0).max(10_000_000),
      }),
    )
    .max(100),
});
export type QuoteEdit = z.infer<typeof QuoteEditSchema>;

/** Saves a reviewer's edits. Totals are always recomputed here; any client-side totals are display only. */
export async function saveQuoteEdits(tenant: TenantContext, quoteId: string, input: unknown): Promise<void> {
  const edit = QuoteEditSchema.parse(input);
  const [existing, company] = await Promise.all([getQuote(tenant.companyId, quoteId), getCompany(tenant.companyId)]);
  if (!existing) throw new QuoteServiceError("Quote not found.");
  if (edit.customerId && !(await getCustomer(tenant.companyId, edit.customerId))) throw new QuoteServiceError("Customer not found.");

  const previous = new Map(existing.lines.map((l) => [l.id, l]));
  const edited: boolean[] = [];
  const lines = edit.lines.map((l) => {
    const before = l.id ? previous.get(l.id) : undefined;
    const changed =
      !!before &&
      (before.description !== l.description ||
      before.quantity !== l.quantity ||
      before.unitPricePence !== l.unitPricePence ||
      before.unit !== l.unit);
    // New lines are marked by source "human"; "edited" means a person changed a suggested line.
    edited.push(before ? changed || before.edited : false);
    return {
      rateCode: l.rateCode,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unitPricePence: l.unitPricePence,
      source: before?.source ?? ("human" as const),
      rationale: before?.rationale ?? null,
    };
  });

  await saveDraftLines(tenant.companyId, quoteId, priceQuote(lines, company.policy), edited, {
    reviewerNotes: edit.reviewerNotes,
    customerId: edit.customerId,
  });
}

/**
 * The only path to an approved quote: an authenticated person at the owning company, acting on
 * a draft. Approving also files an unknown sender as a new customer.
 */
export async function approveQuote(tenant: TenantContext, quoteId: string): Promise<void> {
  const existing = await getQuote(tenant.companyId, quoteId);
  if (!existing) throw new QuoteServiceError("Quote not found.");
  const { quote, lines } = existing;
  if (quote.status !== "draft") throw new QuoteServiceError("This quote has already been dealt with.");
  if (quote.outcome === "quote" && lines.length === 0) throw new QuoteServiceError("Add at least one line before approving a priced quote.");

  if (!quote.customerId && quote.senderEmail) {
    const customerId = await createCustomer(tenant.companyId, {
      name: quote.senderName ?? quote.senderEmail,
      company: quote.extraction.customer.organisation,
      email: quote.senderEmail,
      address: quote.extraction.customer.siteAddress,
    });
    await linkCustomer(tenant.companyId, quoteId, customerId);
  }
  await setQuoteStatus(tenant.companyId, quoteId, "approved", tenant.userId);
}

export async function discardQuote(tenant: TenantContext, quoteId: string): Promise<void> {
  await setQuoteStatus(tenant.companyId, quoteId, "discarded", tenant.userId);
}
