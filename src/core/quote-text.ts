import { formatGBP, type Pence } from "./money";

type Line = { description: string; quantity: number; unit: string; unitPricePence: Pence; lineTotalPence: Pence };

export type QuoteTextInput = {
  companyName: string;
  customerName: string | null;
  jobSummary: string;
  outcome: "quote" | "site_visit";
  lines: Line[];
  minimumAdjustmentPence: Pence;
  subtotalPence: Pence;
  vatPence: Pence;
  totalPence: Pence;
  vatRate: number;
  validityDays: number;
  exclusions: string[];
};

/** Plain text a reviewer can paste into their own email once a quote is approved. */
export function renderQuoteText(q: QuoteTextInput): string {
  const greeting = `Dear ${q.customerName ?? "customer"},`;

  if (q.outcome === "site_visit" && q.lines.length === 0) {
    return [
      greeting,
      "",
      "Thank you for your enquiry.",
      "",
      q.jobSummary,
      "",
      "For a job like this we need to visit the site before we can give you an accurate price. We'll be in touch to arrange a convenient time.",
      ...(q.exclusions.length ? ["", "Please note:", ...q.exclusions.map((e) => `- ${e}`)] : []),
      "",
      "Kind regards,",
      q.companyName,
    ].join("\n");
  }

  const rows = q.lines.map((l) => `- ${l.description}: ${l.quantity} ${l.unit} @ ${formatGBP(l.unitPricePence)} = ${formatGBP(l.lineTotalPence)}`);
  if (q.minimumAdjustmentPence > 0) rows.push(`- Minimum charge adjustment = ${formatGBP(q.minimumAdjustmentPence)}`);

  return [
    greeting,
    "",
    "Thank you for your enquiry. Please find our quotation below.",
    "",
    q.jobSummary,
    "",
    ...rows,
    "",
    `Subtotal (ex VAT): ${formatGBP(q.subtotalPence)}`,
    `VAT at ${Math.round(q.vatRate * 100)}%: ${formatGBP(q.vatPence)}`,
    `Total: ${formatGBP(q.totalPence)}`,
    ...(q.exclusions.length ? ["", "Not included:", ...q.exclusions.map((e) => `- ${e}`)] : []),
    "",
    `This quotation is valid for ${q.validityDays} days.`,
    "",
    "Kind regards,",
    q.companyName,
  ].join("\n");
}
