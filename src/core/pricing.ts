import type { Pence } from "./money";
import type { QuotePolicy } from "./policy";
import { round2 } from "./units";

export type LineSource = "ai" | "human" | "rule";

export type PricedLineInput = {
  rateCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPricePence: Pence;
  source: LineSource;
  rationale?: string | null;
};

export type PricedLine = PricedLineInput & { lineTotalPence: Pence };

export type QuoteTotals = {
  lines: PricedLine[];
  workSubtotalPence: Pence;
  minimumChargeAdjustmentPence: Pence;
  subtotalPence: Pence;
  vatPence: Pence;
  totalPence: Pence;
};

export function lineTotal(quantity: number, unitPricePence: Pence): Pence {
  return Math.round(round2(quantity) * unitPricePence);
}

/**
 * Deterministic totals. Quotes are ex-VAT with VAT shown separately; if the work comes in under
 * the company minimum, a visible adjustment tops it up rather than silently inflating line items.
 */
export function priceQuote(lines: PricedLineInput[], policy: QuotePolicy): QuoteTotals {
  const priced = lines.map((line) => ({
    ...line,
    quantity: round2(line.quantity),
    lineTotalPence: lineTotal(line.quantity, line.unitPricePence),
  }));

  const workSubtotalPence = priced.reduce((sum, l) => sum + l.lineTotalPence, 0);
  const minimumChargeAdjustmentPence =
    workSubtotalPence > 0 && workSubtotalPence < policy.minimumChargePence
      ? policy.minimumChargePence - workSubtotalPence
      : 0;
  const subtotalPence = workSubtotalPence + minimumChargeAdjustmentPence;
  const vatPence = Math.round(subtotalPence * policy.vatRate);

  return {
    lines: priced,
    workSubtotalPence,
    minimumChargeAdjustmentPence,
    subtotalPence,
    vatPence,
    totalPence: subtotalPence + vatPence,
  };
}
