import type { Pence } from "./money";

/**
 * Per-company business rules. These are enforced in code, never left to the model:
 * the model may *suggest* a site visit, but these thresholds can force one regardless.
 */
export type QuotePolicy = {
  vatRate: number;
  minimumChargePence: Pence;
  /** Any single area above this (m²) needs someone to look at it in person. */
  siteVisitAreaM2: number;
  /** Commercial jobs always need a site visit. */
  siteVisitForCommercial: boolean;
  /** Work the company does not do, with the reply the customer should get. */
  notOffered: NotOfferedService[];
  quoteValidityDays: number;
};

export type NotOfferedService = {
  service: string;
  /** Case-insensitive regex source matched against the enquiry as a safety net. */
  pattern: string;
  response: string;
};

export const DEFAULT_POLICY: QuotePolicy = {
  vatRate: 0.2,
  minimumChargePence: 45000,
  siteVisitAreaM2: 150,
  siteVisitForCommercial: true,
  notOffered: [],
  quoteValidityDays: 30,
};
