// Runs the sample enquiries through the real pipeline as a Hollis user and prints each draft.
// Usage: npm run enquiries   (needs a saved AI key for Hollis, e.g. via SEED_ANTHROPIC_API_KEY + db:seed)
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { formatGBP } from "../src/core/money";
import { db } from "../src/server/db/client";
import { companies, users } from "../src/server/db/schema";
import { getQuote } from "../src/server/repos/quotes";
import { generateDraft } from "../src/server/services/quote-service";

async function main() {
  const [user] = await db
    .select({ userId: users.id, userName: users.name, companyId: companies.id, companyName: companies.name })
    .from(users)
    .innerJoin(companies, eq(companies.id, users.companyId))
    .where(eq(users.email, "shaz@hollisgroundworks.example"));
  if (!user) throw new Error("Seed the database first (npm run db:seed).");

  const dir = "data/enquiries";
  for (const file of readdirSync(dir).sort()) {
    const started = Date.now();
    const quoteId = await generateDraft(user, readFileSync(`${dir}/${file}`, "utf8"));
    const result = await getQuote(user.companyId, quoteId);
    if (!result) continue;
    const { quote, lines } = result;

    console.log(`\n=== ${file} (${((Date.now() - started) / 1000).toFixed(1)}s) → ${quote.outcome}`);
    console.log(quote.jobSummary);
    console.log(`Customer: ${quote.customerMatchReason ?? "new customer"}`);
    for (const l of lines) console.log(`  ${l.rateCode ?? "-"}  ${l.quantity} ${l.unit} × ${formatGBP(l.unitPricePence)} = ${formatGBP(l.lineTotalPence)}  (${l.rationale})`);
    if (quote.minimumAdjustmentPence) console.log(`  minimum charge adjustment ${formatGBP(quote.minimumAdjustmentPence)}`);
    console.log(`  subtotal ${formatGBP(quote.subtotalPence)} + VAT ${formatGBP(quote.vatPence)} = ${formatGBP(quote.totalPence)}`);
    for (const f of quote.flags) console.log(`  [${f.severity}/${f.kind}] ${f.message}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
