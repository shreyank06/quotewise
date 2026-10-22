CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai');--> statement-breakpoint
CREATE TYPE "public"."line_source" AS ENUM('ai', 'human', 'rule');--> statement-breakpoint
CREATE TYPE "public"."quote_outcome" AS ENUM('quote', 'site_visit');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'approved', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."rate_status" AS ENUM('active', 'superseded', 'needs_review', 'not_offered');--> statement-breakpoint
CREATE TABLE "ai_credentials" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_hint" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"trade" text NOT NULL,
	"policy" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"emails" text[] DEFAULT '{}' NOT NULL,
	"billing_email" text,
	"phones" text[] DEFAULT '{}' NOT NULL,
	"address" text,
	"notes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_id_company_id_unique" UNIQUE("id","company_id")
);
--> statement-breakpoint
CREATE TABLE "quote_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"rate_code" text,
	"description" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_price_pence" integer NOT NULL,
	"line_total_pence" integer NOT NULL,
	"source" "line_source" NOT NULL,
	"rationale" text,
	"edited" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_id" uuid,
	"customer_match_reason" text,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"outcome" "quote_outcome" NOT NULL,
	"enquiry_text" text NOT NULL,
	"sender_email" text,
	"sender_name" text,
	"subject" text,
	"job_summary" text NOT NULL,
	"flags" jsonb NOT NULL,
	"measurements" jsonb NOT NULL,
	"extraction" jsonb NOT NULL,
	"ai_provider" text NOT NULL,
	"ai_model" text NOT NULL,
	"reviewer_notes" text DEFAULT '' NOT NULL,
	"work_subtotal_pence" integer NOT NULL,
	"minimum_adjustment_pence" integer NOT NULL,
	"subtotal_pence" integer NOT NULL,
	"vat_pence" integer NOT NULL,
	"total_pence" integer NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_id_company_id_unique" UNIQUE("id","company_id")
);
--> statement-breakpoint
CREATE TABLE "rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"item" text NOT NULL,
	"unit" text,
	"unit_raw" text NOT NULL,
	"rate_pence" integer,
	"rate_raw" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" "rate_status" NOT NULL,
	"issues" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rates_company_id_code_unique" UNIQUE("company_id","code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_id_company_id_unique" UNIQUE("id","company_id")
);
--> statement-breakpoint
ALTER TABLE "ai_credentials" ADD CONSTRAINT "ai_credentials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_credentials" ADD CONSTRAINT "ai_credentials_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_company_id_quotes_id_company_id_fk" FOREIGN KEY ("quote_id","company_id") REFERENCES "public"."quotes"("id","company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_company_id_customers_id_company_id_fk" FOREIGN KEY ("customer_id","company_id") REFERENCES "public"."customers"("id","company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_company_id_users_id_company_id_fk" FOREIGN KEY ("created_by","company_id") REFERENCES "public"."users"("id","company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_approved_by_company_id_users_id_company_id_fk" FOREIGN KEY ("approved_by","company_id") REFERENCES "public"."users"("id","company_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rates" ADD CONSTRAINT "rates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_company_id_index" ON "customers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "quote_lines_quote_id_index" ON "quote_lines" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "quotes_company_id_created_at_index" ON "quotes" USING btree ("company_id","created_at");