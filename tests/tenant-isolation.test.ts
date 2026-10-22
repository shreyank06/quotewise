import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { DEFAULT_POLICY } from "../src/core/policy";
import { priceQuote } from "../src/core/pricing";
import { decryptSecret, encryptSecret } from "../src/server/crypto";
import { db } from "../src/server/db/client";
import { aiCredentials, companies, users } from "../src/server/db/schema";
import { getCredential, saveCredential } from "../src/server/repos/credentials";
import { createQuote, getQuote, listQuotes, setQuoteStatus } from "../src/server/repos/quotes";

// Runs against the database in DATABASE_URL using throwaway companies.
const names = ["__test_A", "__test_B"];
let a: { companyId: string; userId: string };
let b: { companyId: string; userId: string };
let quoteId: string;

async function makeCompany(name: string) {
  const [company] = await db.insert(companies).values({ name, trade: "test", policy: DEFAULT_POLICY }).returning();
  const [user] = await db
    .insert(users)
    .values({ companyId: company.id, email: `${name}-${Date.now()}@test.example`, name, passwordHash: "x" })
    .returning();
  return { companyId: company.id, userId: user.id };
}

describe("tenant isolation", () => {
  before(async () => {
    await db.delete(companies).where(inArray(companies.name, names));
    a = await makeCompany(names[0]);
    b = await makeCompany(names[1]);
    quoteId = await createQuote(
      a.companyId,
      {
        outcome: "quote",
        enquiryText: "secret enquiry",
        jobSummary: "A's job",
        flags: [],
        measurements: [],
        extraction: {} as never,
        aiProvider: "anthropic",
        aiModel: "test",
        createdBy: a.userId,
      },
      priceQuote([], DEFAULT_POLICY),
    );
  });

  after(async () => {
    await db.delete(companies).where(inArray(companies.name, names));
    process.exit(0);
  });

  it("doesn't return another company's quote, even by id", async () => {
    assert.ok(await getQuote(a.companyId, quoteId));
    assert.equal(await getQuote(b.companyId, quoteId), null);
    assert.equal((await listQuotes(b.companyId)).length, 0);
  });

  it("doesn't let another company approve a quote", async () => {
    await assert.rejects(setQuoteStatus(b.companyId, quoteId, "approved", b.userId));
    assert.equal((await getQuote(a.companyId, quoteId))?.quote.status, "draft");
  });

  it("rejects a quote whose creator belongs to a different company", async () => {
    await assert.rejects(
      createQuote(
        b.companyId,
        {
          outcome: "quote",
          enquiryText: "x",
          jobSummary: "x",
          flags: [],
          measurements: [],
          extraction: {} as never,
          aiProvider: "anthropic",
          aiModel: "test",
          createdBy: a.userId,
        },
        priceQuote([], DEFAULT_POLICY),
      ),
    );
  });

  it("stores API keys encrypted and bound to their company", async () => {
    await saveCredential(a.companyId, a.userId, { provider: "anthropic", model: "m", apiKey: "sk-ant-test-0123456789abcdef" });
    const [row] = await db.select().from(aiCredentials).where(eq(aiCredentials.companyId, a.companyId));
    assert.ok(!row.encryptedKey.includes("sk-ant-test"));
    assert.equal(row.keyHint, "sk-ant-…cdef");
    assert.equal((await getCredential(a.companyId))?.apiKey, "sk-ant-test-0123456789abcdef");
    assert.equal(await getCredential(b.companyId), null);
    // A ciphertext moved to another company's row can't be decrypted.
    assert.throws(() => decryptSecret(row.encryptedKey, b.companyId));
    assert.equal(decryptSecret(encryptSecret("x", b.companyId), b.companyId), "x");
  });
});
