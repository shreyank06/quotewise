import { parseMoney, type Pence } from "../money";
import { normaliseUnit, type RateUnit } from "../units";
import { parseCsv } from "./csv";

/**
 * - active:       priced and offered to the model
 * - superseded:   an older price replaced by another row; kept for history, never used
 * - needs_review: something is off (no price, ambiguous unit, price may include VAT…);
 *                 hidden from the model until a person confirms it on the Rates page
 * - not_offered:  work the company doesn't do
 */
export type RateStatus = "active" | "superseded" | "needs_review" | "not_offered";

export type ImportedRate = {
  code: string;
  item: string;
  unit: RateUnit | null;
  unitRaw: string;
  ratePence: Pence | null;
  rateRaw: string;
  notes: string;
  status: RateStatus;
  issues: string[];
};

type Rule = (rate: ImportedRate, all: ImportedRate[]) => void;

const flag = (rate: ImportedRate, status: RateStatus, issue: string) => {
  // A more restrictive status always wins over a softer one.
  const severity: Record<RateStatus, number> = { active: 0, needs_review: 1, superseded: 2, not_offered: 3 };
  if (severity[status] > severity[rate.status]) rate.status = status;
  rate.issues.push(issue);
};

const normaliseItem = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const rules: Rule[] = [
  function notOffered(rate) {
    if (/don'?t do|do not do|not offered/i.test(rate.notes)) flag(rate, "not_offered", "Marked as work we don't do");
  },
  function missingPrice(rate) {
    if (rate.ratePence === null) flag(rate, "needs_review", `No usable price ("${rate.rateRaw || "blank"}")`);
  },
  function unknownUnit(rate) {
    if (rate.unit === null) flag(rate, "needs_review", `Unrecognised unit "${rate.unitRaw}"`);
  },
  function includesVat(rate) {
    if (/inc(l|luding)?\.? ?vat/i.test(rate.notes) && rate.ratePence !== null) {
      const exVat = Math.round(rate.ratePence / 1.2);
      flag(rate, "needs_review", `Price looks VAT-inclusive; ex-VAT would be £${(exVat / 100).toFixed(2)}. Confirm before use.`);
      rate.ratePence = exVat;
    }
  },
  function markedOld(rate) {
    if (/\bold\b/i.test(rate.notes)) flag(rate, "superseded", "Marked as an old price");
  },
  function uncertainNote(rate) {
    if (/\?|\bcheck\b|\bask\b|same as/i.test(rate.notes)) flag(rate, "needs_review", `Note needs checking: "${rate.notes}"`);
  },
  function supersededByNewer(rate, all) {
    // "new price from March" on one row retires other rows with the same item and unit.
    const newer = all.find(
      (o) => o !== rate && /new price/i.test(o.notes) && normaliseItem(o.item) === normaliseItem(rate.item) && o.unit === rate.unit,
    );
    if (newer && !/new price/i.test(rate.notes)) flag(rate, "superseded", `Replaced by newer price ${newer.code}`);
  },
  function vagueDuplicate(rate, all) {
    // "Edging kerb" (m) next to "Edging kerb 150x50 on concrete haunch" (m) is probably the same thing.
    const name = normaliseItem(rate.item);
    const fuller = all.find(
      (o) => o !== rate && o.unit === rate.unit && normaliseItem(o.item).startsWith(name + " ") && o.status === "active",
    );
    if (fuller && rate.status === "active") flag(rate, "needs_review", `Looks like a duplicate of ${fuller.code} (${fuller.item})`);
  },
];

/**
 * Notes like "herringbone +£4" or "needs permit if on road, +£60" describe priced extras.
 * They become their own rate rows so the model can pick them explicitly and a person can see them.
 */
function deriveSupplements(rate: ImportedRate): ImportedRate[] {
  if (rate.status !== "active") return [];
  return [...rate.notes.matchAll(/\+£(\d+(?:\.\d+)?)/g)].map((m, i) => {
    // The phrase just before the price names the extra: "charcoal or brindle, herringbone +£4" → "herringbone",
    // "needs permit if on road, +£60" → "permit if on road".
    const before = rate.notes.slice(0, m.index).split(/[,;]/).map((p) => p.trim()).filter(Boolean);
    const label = (before.pop() ?? "").replace(/^(needs|for|if)\s+/i, "") || "extra";
    return {
      code: `${rate.code}-S${i + 1}`,
      item: `${rate.item}: extra for ${label}`,
      unit: rate.unit,
      unitRaw: rate.unitRaw,
      ratePence: Math.round(Number(m[1]) * 100),
      rateRaw: `+£${m[1]}`,
      notes: `Derived from ${rate.code} note: "${rate.notes}"`,
      status: "active" as const,
      issues: [`Created from a note on ${rate.code}`],
    };
  });
}

export function importRates(csvText: string): ImportedRate[] {
  const rows = parseCsv(csvText);
  const rates: ImportedRate[] = rows
    .filter((r) => r.code)
    .map((r) => ({
      code: r.code.toUpperCase(),
      item: r.item ?? "",
      unit: normaliseUnit(r.unit ?? ""),
      unitRaw: r.unit ?? "",
      ratePence: parseMoney(r.rate ?? ""),
      rateRaw: r.rate ?? "",
      notes: r.notes ?? "",
      status: "active",
      issues: [],
    }));

  for (const rule of rules) for (const rate of rates) rule(rate, rates);
  return [...rates, ...rates.flatMap(deriveSupplements)];
}
