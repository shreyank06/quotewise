export type MatchableCustomer = {
  id: string;
  name: string;
  company: string | null;
  emails: string[];
  billingEmail: string | null;
};

export type CustomerMatch = {
  customerId: string;
  confidence: "exact" | "likely";
  reason: string;
} | null;

const FREE_MAIL = /@(gmail|googlemail|hotmail|outlook|yahoo|icloud|aol|live|btinternet|sky)\./i;
const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Deterministic matching, strongest signal first. "likely" matches are shown to the reviewer
 * as a suggestion rather than silently trusted.
 */
export function matchCustomer(
  sender: { email: string | null; name: string | null },
  customers: MatchableCustomer[],
): CustomerMatch {
  const email = sender.email?.toLowerCase();
  if (email) {
    const exact = customers.find((c) => c.emails.includes(email) || c.billingEmail === email);
    if (exact) return { customerId: exact.id, confidence: "exact", reason: `Email ${email} is on file` };

    const domain = domainOf(email);
    if (domain && !FREE_MAIL.test(email)) {
      const sameDomain = customers.find((c) => c.emails.some((e) => domainOf(e) === domain));
      if (sameDomain) return { customerId: sameDomain.id, confidence: "likely", reason: `Same email domain (${domain})` };
    }
  }

  if (sender.name) {
    const name = norm(sender.name);
    const byName = customers.find((c) => norm(c.name) === name || (c.company && norm(c.company) === name));
    if (byName) return { customerId: byName.id, confidence: "likely", reason: `Name matches "${byName.name}"` };
  }
  return null;
}
