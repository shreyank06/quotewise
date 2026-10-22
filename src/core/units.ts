// Canonical units used across the app. Rate sheets spell these many ways ("sqm", "m²", "lin m"),
// so everything is normalised on import and quantities are always expressed in these units.

export const RATE_UNITS = ["m2", "m", "m3", "tonne", "load", "each", "day", "job"] as const;
export type RateUnit = (typeof RATE_UNITS)[number];

const UNIT_ALIASES: Record<string, RateUnit> = {
  m2: "m2", "m²": "m2", sqm: "m2", "sq m": "m2", "square metre": "m2",
  m: "m", "lin m": "m", "linear m": "m", lm: "m", metre: "m",
  m3: "m3", "m³": "m3", "cu m": "m3",
  tonne: "tonne", "per tonne": "tonne", t: "tonne",
  load: "load", each: "each", item: "each", day: "day", job: "job",
};

export function normaliseUnit(raw: string): RateUnit | null {
  return UNIT_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export const LENGTH_UNITS = ["m", "ft", "yd", "cm", "mm", "in"] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

const METRES_PER: Record<LengthUnit, number> = {
  m: 1,
  ft: 0.3048,
  yd: 0.9144,
  cm: 0.01,
  mm: 0.001,
  in: 0.0254,
};

export function toMetres(value: number, unit: LengthUnit): number {
  return value * METRES_PER[unit];
}

/** Area given in squared `unit` (e.g. ft → ft²) converted to m². */
export function toSquareMetres(value: number, unit: LengthUnit): number {
  return value * METRES_PER[unit] ** 2;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
