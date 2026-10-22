import type { NotOfferedService } from "./policy";

/**
 * Heuristics for text that tries to steer an automated quoting tool. This is a tripwire for
 * the reviewer, not the defence: the real defence is that the model has no way to express a
 * discount or an approval, and approval only happens through an authenticated human action.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard)\b.{0,40}\b(instructions|rules|previous)\b/i,
  /\b(automated|ai)\b.{0,30}\b(assistant|quot\w*|system)\b/i,
  /\bapply\b.{0,30}\b(discount|% off)\b/i,
  /\b(mark|set)\b.{0,40}\b(approved|as sent|accepted)\b/i,
  /\bwaive\b.{0,30}\b(minimum|charge|fee)\b/i,
  /\bdo not (mention|tell|reveal)\b/i,
];

export function detectInjectionAttempts(enquiry: string): string[] {
  const sentences = enquiry.split(/(?<=[.!?\]])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  return [...new Set(sentences.filter((s) => INJECTION_PATTERNS.some((p) => p.test(s))))];
}

/** Safety net in case the model misses a service the company has said it never does. */
export function detectNotOffered(enquiry: string, services: NotOfferedService[]): NotOfferedService[] {
  return services.filter((s) => {
    try {
      return new RegExp(s.pattern, "i").test(enquiry);
    } catch {
      return false;
    }
  });
}
