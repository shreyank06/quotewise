import { and, asc, desc, eq } from "drizzle-orm";
import type { QuoteTotals } from "@/core/pricing";
import { db, type Tx } from "../db/client";
import { customers, quoteLines, quotes, users } from "../db/schema";

export type QuoteRow = typeof quotes.$inferSelect;
export type QuoteLineRow = typeof quoteLines.$inferSelect;
export type NewQuote = Omit<typeof quotes.$inferInsert, "id" | "companyId" | keyof TotalsColumns>;
type TotalsColumns = Pick<QuoteRow, "workSubtotalPence" | "minimumAdjustmentPence" | "subtotalPence" | "vatPence" | "totalPence">;

const totalsColumns = (t: QuoteTotals): TotalsColumns => ({
  workSubtotalPence: t.workSubtotalPence,
  minimumAdjustmentPence: t.minimumChargeAdjustmentPence,
  subtotalPence: t.subtotalPence,
  vatPence: t.vatPence,
  totalPence: t.totalPence,
});

async function insertLines(tx: Tx, companyId: string, quoteId: string, totals: QuoteTotals, edited: boolean[] = []) {
  if (totals.lines.length === 0) return;
  await tx.insert(quoteLines).values(
    totals.lines.map((l, position) => ({
      quoteId,
      companyId,
      position,
      rateCode: l.rateCode,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unitPricePence: l.unitPricePence,
      lineTotalPence: l.lineTotalPence,
      source: l.source,
      rationale: l.rationale ?? null,
      edited: edited[position] ?? false,
    })),
  );
}

export async function createQuote(companyId: string, quote: NewQuote, totals: QuoteTotals): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(quotes)
      .values({ ...quote, companyId, ...totalsColumns(totals) })
      .returning({ id: quotes.id });
    await insertLines(tx, companyId, row.id, totals);
    return row.id;
  });
}

export function listQuotes(companyId: string) {
  return db
    .select({
      id: quotes.id,
      status: quotes.status,
      outcome: quotes.outcome,
      subject: quotes.subject,
      senderName: quotes.senderName,
      customerName: customers.name,
      totalPence: quotes.totalPence,
      createdAt: quotes.createdAt,
      flags: quotes.flags,
    })
    .from(quotes)
    .leftJoin(customers, and(eq(customers.id, quotes.customerId), eq(customers.companyId, quotes.companyId)))
    .where(eq(quotes.companyId, companyId))
    .orderBy(desc(quotes.createdAt));
}

export async function getQuote(companyId: string, quoteId: string) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, companyId)))
    .limit(1);
  if (!quote) return null;
  const lines = await db
    .select()
    .from(quoteLines)
    .where(and(eq(quoteLines.quoteId, quoteId), eq(quoteLines.companyId, companyId)))
    .orderBy(asc(quoteLines.position));
  const [approver] = quote.approvedBy
    ? await db.select({ name: users.name }).from(users).where(and(eq(users.id, quote.approvedBy), eq(users.companyId, companyId)))
    : [];
  return { quote, lines, approverName: approver?.name ?? null };
}

/** Replaces a draft's lines. The status guard means an approved quote can never be edited. */
export async function saveDraftLines(
  companyId: string,
  quoteId: string,
  totals: QuoteTotals,
  edited: boolean[],
  patch: { reviewerNotes: string; customerId: string | null },
): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(quotes)
      .set({ ...totalsColumns(totals), ...patch, updatedAt: new Date() })
      .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, companyId), eq(quotes.status, "draft")))
      .returning({ id: quotes.id });
    if (updated.length === 0) throw new Error("Only draft quotes can be edited");
    await tx.delete(quoteLines).where(and(eq(quoteLines.quoteId, quoteId), eq(quoteLines.companyId, companyId)));
    await insertLines(tx, companyId, quoteId, totals, edited);
  });
}

export async function linkCustomer(companyId: string, quoteId: string, customerId: string): Promise<void> {
  await db
    .update(quotes)
    .set({ customerId, updatedAt: new Date() })
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, companyId), eq(quotes.status, "draft")));
}

export async function setQuoteStatus(
  companyId: string,
  quoteId: string,
  status: "approved" | "discarded",
  userId: string,
): Promise<void> {
  const updated = await db
    .update(quotes)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "approved" ? { approvedBy: userId, approvedAt: new Date() } : {}),
    })
    .where(and(eq(quotes.id, quoteId), eq(quotes.companyId, companyId), eq(quotes.status, "draft")))
    .returning({ id: quotes.id });
  if (updated.length === 0) throw new Error("Quote is no longer a draft");
}
