import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { NormalisedMeasurement, QuoteFlag } from "@/core/quote-builder";
import type { QuotePolicy } from "@/core/policy";
import type { QuoteExtraction } from "@/core/quote-schema";

// Every tenant-owned table carries company_id, and child rows reference their parent by
// (id, company_id) so a row can never point across tenants even if application code slips.

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  trade: text("trade").notNull(),
  policy: jsonb("policy").$type<QuotePolicy>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.id, t.companyId)],
);

export const sessions = pgTable("sessions", {
  /** SHA-256 of the cookie token; the raw token is never stored. */
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const aiProviderEnum = pgEnum("ai_provider", ["anthropic", "openai"]);

export const aiCredentials = pgTable("ai_credentials", {
  companyId: uuid("company_id").primaryKey().references(() => companies.id, { onDelete: "cascade" }),
  provider: aiProviderEnum("provider").notNull(),
  model: text("model").notNull(),
  /** AES-256-GCM envelope, bound to company_id as associated data. */
  encryptedKey: text("encrypted_key").notNull(),
  keyHint: text("key_hint").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const rateStatusEnum = pgEnum("rate_status", ["active", "superseded", "needs_review", "not_offered"]);

export const rates = pgTable(
  "rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    item: text("item").notNull(),
    unit: text("unit"),
    unitRaw: text("unit_raw").notNull(),
    ratePence: integer("rate_pence"),
    rateRaw: text("rate_raw").notNull(),
    notes: text("notes").notNull().default(""),
    status: rateStatusEnum("status").notNull(),
    issues: text("issues").array().notNull().default(sql`'{}'`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.companyId, t.code)],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    company: text("company"),
    emails: text("emails").array().notNull().default(sql`'{}'`),
    billingEmail: text("billing_email"),
    phones: text("phones").array().notNull().default(sql`'{}'`),
    address: text("address"),
    notes: text("notes").array().notNull().default(sql`'{}'`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.id, t.companyId), index().on(t.companyId)],
);

export const quoteStatusEnum = pgEnum("quote_status", ["draft", "approved", "discarded"]);
export const quoteOutcomeEnum = pgEnum("quote_outcome", ["quote", "site_visit"]);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id"),
    customerMatchReason: text("customer_match_reason"),
    status: quoteStatusEnum("status").notNull().default("draft"),
    outcome: quoteOutcomeEnum("outcome").notNull(),
    enquiryText: text("enquiry_text").notNull(),
    senderEmail: text("sender_email"),
    senderName: text("sender_name"),
    subject: text("subject"),
    jobSummary: text("job_summary").notNull(),
    flags: jsonb("flags").$type<QuoteFlag[]>().notNull(),
    measurements: jsonb("measurements").$type<NormalisedMeasurement[]>().notNull(),
    /** The validated model output, kept verbatim for audit. */
    extraction: jsonb("extraction").$type<QuoteExtraction>().notNull(),
    aiProvider: text("ai_provider").notNull(),
    aiModel: text("ai_model").notNull(),
    reviewerNotes: text("reviewer_notes").notNull().default(""),
    workSubtotalPence: integer("work_subtotal_pence").notNull(),
    minimumAdjustmentPence: integer("minimum_adjustment_pence").notNull(),
    subtotalPence: integer("subtotal_pence").notNull(),
    vatPence: integer("vat_pence").notNull(),
    totalPence: integer("total_pence").notNull(),
    createdBy: uuid("created_by").notNull(),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.id, t.companyId),
    index().on(t.companyId, t.createdAt),
    foreignKey({ columns: [t.customerId, t.companyId], foreignColumns: [customers.id, customers.companyId] }),
    foreignKey({ columns: [t.createdBy, t.companyId], foreignColumns: [users.id, users.companyId] }),
    foreignKey({ columns: [t.approvedBy, t.companyId], foreignColumns: [users.id, users.companyId] }),
  ],
);

export const lineSourceEnum = pgEnum("line_source", ["ai", "human", "rule"]);

export const quoteLines = pgTable(
  "quote_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id").notNull(),
    companyId: uuid("company_id").notNull(),
    position: integer("position").notNull(),
    rateCode: text("rate_code"),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    quantity: doublePrecision("quantity").notNull(),
    unitPricePence: integer("unit_price_pence").notNull(),
    lineTotalPence: integer("line_total_pence").notNull(),
    source: lineSourceEnum("source").notNull(),
    rationale: text("rationale"),
    edited: boolean("edited").notNull().default(false),
  },
  (t) => [
    foreignKey({ columns: [t.quoteId, t.companyId], foreignColumns: [quotes.id, quotes.companyId] }).onDelete("cascade"),
    index().on(t.quoteId),
  ],
);
