import { and, asc, eq } from "drizzle-orm";
import type { ImportedCustomer } from "@/core/import/customers";
import { db } from "../db/client";
import { customers } from "../db/schema";

export type CustomerRow = typeof customers.$inferSelect;

export function listCustomers(companyId: string): Promise<CustomerRow[]> {
  return db.select().from(customers).where(eq(customers.companyId, companyId)).orderBy(asc(customers.name));
}

export async function getCustomer(companyId: string, customerId: string): Promise<CustomerRow | null> {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

/** Adds imported customers, skipping anyone already on file under the same email. */
export async function addImportedCustomers(companyId: string, imported: ImportedCustomer[]): Promise<{ added: number; skipped: number }> {
  const existing = await listCustomers(companyId);
  const knownEmails = new Set(existing.flatMap((c) => c.emails));
  const fresh = imported.filter((c) => !c.emails.some((e) => knownEmails.has(e)));
  if (fresh.length > 0) {
    await db.insert(customers).values(
      fresh.map((c) => ({
        companyId,
        name: c.name,
        company: c.company,
        emails: c.emails,
        billingEmail: c.billingEmail,
        phones: c.phones,
        address: c.address,
        notes: c.notes,
      })),
    );
  }
  return { added: fresh.length, skipped: imported.length - fresh.length };
}

export async function createCustomer(
  companyId: string,
  data: { name: string; company: string | null; email: string | null; address: string | null },
): Promise<string> {
  const [row] = await db
    .insert(customers)
    .values({
      companyId,
      name: data.name,
      company: data.company,
      emails: data.email ? [data.email.toLowerCase()] : [],
      address: data.address,
      notes: ["Added from an enquiry"],
    })
    .returning({ id: customers.id });
  return row.id;
}
