import { detectInjectionAttempts, detectNotOffered } from "./guardrails";
import type { Pence } from "./money";
import type { QuotePolicy } from "./policy";
import { priceQuote, type PricedLineInput, type QuoteTotals } from "./pricing";
import type { Measurement, QuoteExtraction } from "./quote-schema";
import { round2, toMetres, toSquareMetres, type RateUnit } from "./units";

export type PriceableRate = { code: string; item: string; unit: RateUnit; ratePence: Pence };

export type FlagKind =
  | "site_visit"
  | "not_offered"
  | "no_rate"
  | "unclear"
  | "injection"
  | "rejected_line"
  | "quantity"
  | "minimum_charge"
  | "assumption"
  | "question";

export type QuoteFlag = { kind: FlagKind; severity: "block" | "warn" | "info"; message: string };

export type NormalisedMeasurement = Measurement & { areaM2: number | null; lengthM: number | null; widthM: number | null };

export type DraftQuote = {
  outcome: "quote" | "site_visit";
  lines: PricedLineInput[];
  totals: QuoteTotals;
  flags: QuoteFlag[];
  measurements: NormalisedMeasurement[];
};

export function normaliseMeasurement(m: Measurement): NormalisedMeasurement {
  const lengthM = m.length !== null ? round2(toMetres(m.length, m.unit)) : null;
  const widthM = m.width !== null ? round2(toMetres(m.width, m.unit)) : null;
  let areaM2: number | null = null;
  if (m.kind === "area" && m.area !== null) areaM2 = round2(toSquareMetres(m.area, m.unit));
  if (m.kind === "rectangle" && m.length !== null && m.width !== null)
    areaM2 = round2(toMetres(m.length, m.unit) * toMetres(m.width, m.unit));
  return { ...m, areaM2, lengthM, widthM };
}

type LineResult = { line: PricedLineInput | null; flags: QuoteFlag[] };

/** Turns one model-suggested line into a priced line, or rejects it with a reason. */
function resolveLine(
  item: QuoteExtraction["lineItems"][number],
  rates: Map<string, PriceableRate>,
  measurements: Map<string, NormalisedMeasurement>,
): LineResult {
  const rate = rates.get(item.rateCode.trim().toUpperCase());
  if (!rate) {
    return {
      line: null,
      flags: [{ kind: "rejected_line", severity: "warn", message: `Dropped "${item.rateCode}": not an active rate on the price list.` }],
    };
  }

  const flags: QuoteFlag[] = [];
  let quantity = item.quantity;

  // When the model ties a quantity to measurements, recompute it here so unit conversion
  // (feet → metres, ft² → m²) is never left to the model's arithmetic.
  if (item.quantityFrom.length > 0) {
    const parts = item.quantityFrom.map(({ measurementId, dimension }) => {
      const m = measurements.get(measurementId);
      if (!m) return null;
      if (rate.unit === "m2" && dimension === "area") return m.areaM2;
      if (rate.unit === "m" && dimension === "length") return m.lengthM;
      if (rate.unit === "m" && dimension === "width") return m.widthM;
      return null;
    });
    if (parts.every((p): p is number => p !== null)) {
      const measured = round2(parts.reduce((a, b) => a + b, 0));
      if (Math.abs(measured - quantity) > Math.max(0.05 * measured, 0.01)) {
        flags.push({
          kind: "quantity",
          severity: "info",
          message: `${rate.code}: used measured ${measured} ${rate.unit} instead of the model's ${quantity}.`,
        });
      }
      quantity = measured;
    } else {
      flags.push({
        kind: "quantity",
        severity: "warn",
        message: `${rate.code}: couldn't derive quantity from measurements for a ${rate.unit} rate; kept estimate ${quantity}. Check it.`,
      });
    }
  }

  if (!(quantity > 0)) {
    return { line: null, flags: [...flags, { kind: "rejected_line", severity: "warn", message: `Dropped ${rate.code}: quantity was ${quantity}.` }] };
  }

  return {
    line: {
      rateCode: rate.code,
      description: rate.item,
      unit: rate.unit,
      quantity: round2(quantity),
      unitPricePence: rate.ratePence,
      source: "ai",
      rationale: item.rationale,
    },
    flags,
  };
}

const UNPRICED_FLAG: Record<QuoteExtraction["unpricedItems"][number]["reason"], { kind: FlagKind; severity: QuoteFlag["severity"] }> = {
  not_offered: { kind: "not_offered", severity: "warn" },
  no_rate: { kind: "no_rate", severity: "warn" },
  needs_site_visit: { kind: "site_visit", severity: "warn" },
  unclear: { kind: "unclear", severity: "warn" },
};

/**
 * Combines the model's reading of the enquiry with the company's price list and rules.
 * Every decision with commercial consequence (which rates exist, prices, site-visit thresholds,
 * minimum charge, VAT) is made here, in code.
 */
export function buildDraftQuote(input: {
  enquiry: string;
  extraction: QuoteExtraction;
  rates: PriceableRate[];
  policy: QuotePolicy;
}): DraftQuote {
  const { enquiry, extraction, policy } = input;
  const rates = new Map(input.rates.map((r) => [r.code.toUpperCase(), r]));
  const measurements = extraction.measurements.map(normaliseMeasurement);
  const measurementById = new Map(measurements.map((m) => [m.id, m]));
  const flags: QuoteFlag[] = [];

  // Prompt-injection tripwire: union of our heuristics and what the model noticed.
  // Both sources often catch the same text at different lengths, so keep only the longest quotes.
  const candidates = [...new Set([...detectInjectionAttempts(enquiry), ...extraction.suspiciousInstructions].map((s) => s.trim()))];
  const suspicious = candidates.filter((s) => !candidates.some((other) => other !== s && other.includes(s)));
  if (suspicious.length > 0) {
    flags.push({
      kind: "injection",
      severity: "block",
      message: `The enquiry contains instructions aimed at the quoting system. They were ignored: ${suspicious.map((s) => `"${s}"`).join(" ")}`,
    });
  }

  // Site visit: the model's judgement, plus hard thresholds it cannot talk its way past.
  const siteVisitReasons: string[] = [];
  if (extraction.siteVisit.required) siteVisitReasons.push(extraction.siteVisit.reason ?? "The model judged this needs a site visit.");
  if (policy.siteVisitForCommercial && extraction.jobType === "commercial") siteVisitReasons.push("Commercial job.");
  const largest = Math.max(0, ...measurements.map((m) => m.areaM2 ?? 0));
  if (largest > policy.siteVisitAreaM2) siteVisitReasons.push(`Area of ${largest} m² is over the ${policy.siteVisitAreaM2} m² limit for quoting off an email.`);
  const outcome = siteVisitReasons.length > 0 ? "site_visit" : "quote";
  if (outcome === "site_visit") {
    flags.push({ kind: "site_visit", severity: "block", message: `Site visit needed before pricing. ${siteVisitReasons.join(" ")}` });
  }

  for (const u of extraction.unpricedItems) {
    const { kind, severity } = UNPRICED_FLAG[u.reason];
    flags.push({ kind, severity, message: `${u.request}: ${u.note}` });
  }

  // Safety net for services the company never does. The model may have correctly decided the
  // customer isn't asking for one (e.g. "we already have a dropped kerb"), so this is a prompt to check.
  const reported = extraction.unpricedItems.filter((u) => u.reason === "not_offered").map((u) => u.request.toLowerCase()).join(" ");
  for (const s of detectNotOffered(enquiry, policy.notOffered)) {
    if (!new RegExp(s.pattern, "i").test(reported)) {
      flags.push({ kind: "not_offered", severity: "info", message: `Enquiry mentions ${s.service.toLowerCase()} (we don't do this). Check it isn't being asked for. Suggested reply: ${s.response}` });
    }
  }

  // A site-visit outcome is deliberately left unpriced, so nobody can send a guess.
  const lines: PricedLineInput[] = [];
  if (outcome === "quote") {
    for (const item of extraction.lineItems) {
      const result = resolveLine(item, rates, measurementById);
      flags.push(...result.flags);
      if (result.line) lines.push(result.line);
    }
  }

  const totals = priceQuote(lines, policy);
  if (totals.minimumChargeAdjustmentPence > 0) {
    flags.push({ kind: "minimum_charge", severity: "info", message: "Work comes in under the minimum charge, so an adjustment has been added." });
  }

  for (const a of extraction.assumptions) flags.push({ kind: "assumption", severity: "info", message: a });
  for (const q of extraction.questionsForCustomer) flags.push({ kind: "question", severity: "info", message: q });

  return { outcome, lines, totals, flags, measurements };
}
