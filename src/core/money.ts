// All money is held as integer pence to avoid floating-point drift in totals.

export type Pence = number;

export function toPence(pounds: number): Pence {
  return Math.round(pounds * 100);
}

export function formatGBP(pence: Pence): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

/** Parses spreadsheet-style money ("£1,250", "62", "14.50"). Returns null for blanks and placeholders like "TBC". */
export function parseMoney(raw: string): Pence | null {
  const cleaned = raw.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return toPence(Number(cleaned));
}
