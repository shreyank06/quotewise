import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { ImportedRate, RateStatus } from "@/core/import/rates";
import type { PriceableRate } from "@/core/quote-builder";
import type { RateUnit } from "@/core/units";
import { db } from "../db/client";
import { rates } from "../db/schema";

export type RateRow = typeof rates.$inferSelect;

export function listRates(companyId: string): Promise<RateRow[]> {
  return db.select().from(rates).where(eq(rates.companyId, companyId)).orderBy(asc(rates.code));
}

/** Only rates a person has no open question about are ever shown to the model or priced. */
export async function listPriceableRates(companyId: string): Promise<PriceableRate[]> {
  const rows = await db
    .select()
    .from(rates)
    .where(and(eq(rates.companyId, companyId), eq(rates.status, "active"), isNotNull(rates.ratePence), isNotNull(rates.unit)))
    .orderBy(asc(rates.code));
  return rows.map((r) => ({ code: r.code, item: r.item, unit: r.unit as RateUnit, ratePence: r.ratePence! }));
}

/** A re-import replaces the price list. Existing quotes keep their own copies of line prices. */
export async function replaceRates(companyId: string, imported: ImportedRate[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(rates).where(eq(rates.companyId, companyId));
    if (imported.length === 0) return;
    await tx.insert(rates).values(imported.map((r) => ({ ...r, companyId })));
  });
}

export async function updateRate(
  companyId: string,
  rateId: string,
  patch: { ratePence: number | null; status: RateStatus; unit: RateUnit | null },
): Promise<void> {
  const result = await db
    .update(rates)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(rates.id, rateId), eq(rates.companyId, companyId)))
    .returning({ id: rates.id });
  if (result.length === 0) throw new Error("Rate not found");
}
