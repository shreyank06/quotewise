import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { companies } from "../db/schema";

export async function getCompany(companyId: string) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) throw new Error("Company not found");
  return company;
}
