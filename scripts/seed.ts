// Seeds two isolated companies. Usage: npm run db:seed
// Safe to re-run: it wipes and recreates only the seeded companies.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { inArray } from "drizzle-orm";
import { DEFAULT_MODELS } from "../src/ai/provider";
import { DEFAULT_POLICY, type QuotePolicy } from "../src/core/policy";
import { hashPassword } from "../src/server/auth/password";
import { db } from "../src/server/db/client";
import { companies, users } from "../src/server/db/schema";
import { saveCredential } from "../src/server/repos/credentials";
import { importCustomersCsv, importRatesCsv } from "../src/server/services/import-service";

type SeedCompany = {
  name: string;
  trade: string;
  policy: QuotePolicy;
  dataDir: string;
  users: { name: string; email: string }[];
};

const SEED: SeedCompany[] = [
  {
    name: "Hollis Groundworks",
    trade: "groundworks: driveways, patios, drainage near Walsall",
    dataDir: "data/hollis",
    policy: {
      ...DEFAULT_POLICY,
      minimumChargePence: 45000,
      siteVisitAreaM2: 150,
      notOffered: [
        {
          service: "Dropped kerbs and vehicle crossovers",
          pattern: "dropped kerb|vehicle crossover|kerb drop",
          response: "These must be done by a council-approved contractor. Please contact your local council (Walsall Council: highways team).",
        },
      ],
    },
    users: [
      { name: "Dave Hollis", email: "dave@hollisgroundworks.example" },
      { name: "Shaz", email: "shaz@hollisgroundworks.example" },
    ],
  },
  {
    name: "Gaz Green Landscapes",
    trade: "landscaping: turf, fencing, planting near Cannock",
    dataDir: "data/gaz",
    policy: {
      ...DEFAULT_POLICY,
      minimumChargePence: 30000,
      siteVisitAreaM2: 300,
      notOffered: [
        {
          service: "Tree felling and tree surgery",
          pattern: "tree (felling|surgery|removal)|fell (a|the) tree",
          response: "We don't do tree work. Please use a qualified arborist.",
        },
      ],
    },
    users: [{ name: "Gaz", email: "gaz@gazgreen.example" }],
  },
];

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 10) throw new Error("Set SEED_PASSWORD (10+ chars) before seeding.");
  const passwordHash = await hashPassword(password);

  await db.delete(companies).where(inArray(companies.name, SEED.map((c) => c.name)));

  for (const seed of SEED) {
    const [company] = await db.insert(companies).values({ name: seed.name, trade: seed.trade, policy: seed.policy }).returning();
    const created = await db
      .insert(users)
      .values(seed.users.map((u) => ({ ...u, companyId: company.id, passwordHash })))
      .returning({ id: users.id });

    const rates = await importRatesCsv(company.id, readFileSync(`${seed.dataDir}/rates.csv`, "utf8"));
    const customers = await importCustomersCsv(company.id, readFileSync(`${seed.dataDir}/customers.csv`, "utf8"));

    // Optional, for local testing only. In the deployed app each company enters its own key.
    if (process.env.SEED_ANTHROPIC_API_KEY) {
      await saveCredential(company.id, created[0].id, {
        provider: "anthropic",
        model: DEFAULT_MODELS.anthropic,
        apiKey: process.env.SEED_ANTHROPIC_API_KEY,
      });
    }

    console.log(`${seed.name}\n  logins: ${seed.users.map((u) => u.email).join(", ")}\n  ${rates.message}\n  ${customers.message}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
