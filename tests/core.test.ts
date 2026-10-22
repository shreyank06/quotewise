import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { matchCustomer } from "../src/core/customer-match";
import { parseEnquiryHeaders } from "../src/core/enquiry";
import { detectInjectionAttempts } from "../src/core/guardrails";
import { importCustomers } from "../src/core/import/customers";
import { importRates } from "../src/core/import/rates";
import { parseMoney } from "../src/core/money";
import { DEFAULT_POLICY } from "../src/core/policy";
import { priceQuote } from "../src/core/pricing";
import { normaliseUnit } from "../src/core/units";

const hollisRates = readFileSync("data/hollis/rates.csv", "utf8");
const hollisCustomers = readFileSync("data/hollis/customers.csv", "utf8");
const kestrelEmail = readFileSync("data/enquiries/3-kestrel-row-patio.txt", "utf8");
const okaforEmail = readFileSync("data/enquiries/1-okafor-driveway.txt", "utf8");

describe("money and units", () => {
  it("parses spreadsheet money and rejects placeholders", () => {
    assert.equal(parseMoney("£1,250"), 125000);
    assert.equal(parseMoney("14.50"), 1450);
    assert.equal(parseMoney("TBC"), null);
    assert.equal(parseMoney(""), null);
  });

  it("normalises the unit spellings in Shaz's sheet", () => {
    for (const u of ["m2", "sqm", "m²"]) assert.equal(normaliseUnit(u), "m2");
    for (const u of ["lin m", "m"]) assert.equal(normaliseUnit(u), "m");
    assert.equal(normaliseUnit("per tonne"), "tonne");
    assert.equal(normaliseUnit("bucket"), null);
  });
});

describe("pricing", () => {
  const line = (quantity: number, unitPricePence: number) => ({
    rateCode: "X",
    description: "x",
    unit: "m2",
    quantity,
    unitPricePence,
    source: "ai" as const,
  });

  it("quotes ex VAT and adds VAT separately", () => {
    const t = priceQuote([line(10, 6200)], DEFAULT_POLICY);
    assert.equal(t.subtotalPence, 62000);
    assert.equal(t.vatPence, 12400);
    assert.equal(t.totalPence, 74400);
  });

  it("tops small jobs up to the minimum charge with a visible adjustment", () => {
    const t = priceQuote([line(2, 6200)], DEFAULT_POLICY);
    assert.equal(t.workSubtotalPence, 12400);
    assert.equal(t.minimumChargeAdjustmentPence, 45000 - 12400);
    assert.equal(t.subtotalPence, 45000);
  });

  it("doesn't charge the minimum on an empty quote", () => {
    assert.equal(priceQuote([], DEFAULT_POLICY).totalPence, 0);
  });
});

describe("rates import", () => {
  const rates = new Map(importRates(hollisRates).map((r) => [r.code, r]));

  it("retires old and superseded prices", () => {
    assert.equal(rates.get("BP02")?.status, "superseded");
    assert.equal(rates.get("EX06")?.status, "superseded");
    assert.equal(rates.get("SB02")?.status, "superseded");
    assert.equal(rates.get("SB03")?.status, "active");
  });

  it("holds back anything ambiguous for a person to confirm", () => {
    assert.equal(rates.get("TM03")?.status, "needs_review"); // TBC
    assert.equal(rates.get("CO02")?.status, "needs_review"); // per load or per m3?
    assert.equal(rates.get("PT01")?.status, "needs_review"); // inc VAT
    assert.equal(rates.get("PT01")?.ratePence, 7083);
    assert.equal(rates.get("KB02")?.status, "needs_review"); // duplicate of KB01
  });

  it("marks work Hollis doesn't do", () => {
    assert.equal(rates.get("KB04")?.status, "not_offered");
  });

  it("turns priced notes into explicit supplement rates", () => {
    assert.equal(rates.get("BP01-S1")?.ratePence, 400);
    assert.equal(rates.get("PL01-S1")?.ratePence, 6000);
  });
});

describe("customer import", () => {
  const customers = importCustomers(hollisCustomers);

  it("merges duplicate rows", () => {
    assert.equal(customers.length, 9);
    const okafor = customers.find((c) => c.name === "Patience Okafor");
    assert.deepEqual(okafor?.emails.sort(), ["p.okafor@example.com", "patience.okafor64@example.com"]);
  });

  it("keeps the separate invoicing address for Kestrel Row", () => {
    const hale = customers.find((c) => c.company === "Kestrel Row Lettings");
    assert.equal(hale?.billingEmail, "accounts@kestrelrow.example");
  });
});

describe("enquiry handling", () => {
  it("reads the sender from the email header", () => {
    assert.deepEqual(parseEnquiryHeaders(okaforEmail), {
      fromName: "Patience Okafor",
      fromEmail: "patience.okafor64@example.com",
      subject: "Drive extension - quote please",
    });
  });

  it("matches a repeat customer by any of their emails", () => {
    const customers = importCustomers(hollisCustomers).map((c, i) => ({ ...c, id: String(i) }));
    const match = matchCustomer({ email: "patience.okafor64@example.com", name: null }, customers);
    assert.equal(customers[Number(match?.customerId)].name, "Patience Okafor");
    assert.equal(match?.confidence, "exact");
  });

  it("flags the hidden instruction in the Kestrel Row email", () => {
    const hits = detectInjectionAttempts(kestrelEmail);
    assert.ok(hits.some((h) => /40% partner discount/.test(h)));
  });

  it("doesn't flag an ordinary enquiry", () => {
    assert.deepEqual(detectInjectionAttempts(okaforEmail), []);
  });
});
