import { ArrowLeft, Ban, FileText, Hammer, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { renderQuoteText } from "@/core/quote-text";
import { formatDateTime } from "@/lib/format";
import { requireTenant } from "@/server/auth/session";
import { getCompany } from "@/server/repos/companies";
import { getCustomer, listCustomers } from "@/server/repos/customers";
import { getQuote } from "@/server/repos/quotes";
import { listPriceableRates } from "@/server/repos/rates";
import { OutcomeBadge, StatusBadge } from "../quote-badges";
import { CopyQuote } from "./copy-quote";
import { CustomerPanel, MeasurementsPanel, ReviewPanel } from "./panels";
import { QuoteEditor } from "./quote-editor";

export default async function QuotePage({ params }: PageProps<"/quotes/[id]">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const tenant = await requireTenant();
  const data = await getQuote(tenant.companyId, id);
  if (!data) notFound();
  const { quote, lines, approverName } = data;

  const [company, customers, rates, customer] = await Promise.all([
    getCompany(tenant.companyId),
    listCustomers(tenant.companyId),
    listPriceableRates(tenant.companyId),
    quote.customerId ? getCustomer(tenant.companyId, quote.customerId) : null,
  ]);

  const exclusions = quote.flags.filter((f) => (f.kind === "not_offered" || f.kind === "no_rate") && f.severity !== "info").map((f) => f.message);
  const siteAddress = quote.extraction.customer.siteAddress;

  return (
    <>
      <Link href="/quotes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="size-4" /> Quotes
      </Link>
      <PageHeader
        title={quote.subject ?? "Enquiry"}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <StatusBadge status={quote.status} />
            <OutcomeBadge outcome={quote.outcome} />
            <span className="inline-flex items-center gap-1.5 text-stone-500">
              <Sparkles className="size-3.5" /> Drafted {formatDateTime(quote.createdAt)} with {quote.aiModel}
            </span>
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {quote.status === "approved" && (
            <CopyQuote
              approvedLine={`Approved by ${approverName ?? "a team member"}${quote.approvedAt ? ` on ${formatDateTime(quote.approvedAt)}` : ""}`}
              text={renderQuoteText({
                companyName: company.name,
                customerName: customer?.name ?? quote.senderName,
                jobSummary: quote.jobSummary,
                outcome: quote.outcome,
                lines,
                minimumAdjustmentPence: quote.minimumAdjustmentPence,
                subtotalPence: quote.subtotalPence,
                vatPence: quote.vatPence,
                totalPence: quote.totalPence,
                vatRate: company.policy.vatRate,
                validityDays: company.policy.quoteValidityDays,
                exclusions,
              })}
            />
          )}
          {quote.status === "discarded" && <Alert tone="neutral" icon={Ban} title="This draft was discarded" />}
          {quote.status === "draft" && quote.outcome === "site_visit" && (
            <Alert tone="amber" icon={MapPin} title="This one needs a site visit before it's priced">
              It hasn&apos;t been priced, so nobody can send a guess. Approving it gives you a reply asking to arrange a visit. You can still add items if you decide to price it.
            </Alert>
          )}

          <Card>
            <CardHeader icon={Hammer} title="The job" />
            <CardBody className="space-y-3">
              <p className="text-[15px] leading-relaxed text-stone-700">{quote.jobSummary}</p>
              {siteAddress && (
                <p className="flex items-center gap-1.5 text-sm text-stone-500">
                  <MapPin className="size-4" /> {siteAddress}
                </p>
              )}
            </CardBody>
          </Card>

          <QuoteEditor
            key={quote.updatedAt.toISOString()}
            quoteId={quote.id}
            editable={quote.status === "draft"}
            lines={lines.map((l) => ({
              id: l.id,
              rateCode: l.rateCode,
              description: l.description,
              unit: l.unit,
              quantity: l.quantity,
              unitPricePence: l.unitPricePence,
              source: l.source,
              rationale: l.rationale,
              edited: l.edited,
            }))}
            policy={company.policy}
            rates={rates}
            customers={customers.map((c) => ({ id: c.id, label: c.company ? `${c.name} (${c.company})` : c.name }))}
            customerId={quote.customerId}
            reviewerNotes={quote.reviewerNotes}
            blockingFlags={quote.status === "draft" ? quote.flags.filter((f) => f.severity === "block").length : 0}
            approveLabel={quote.outcome === "site_visit" && lines.length === 0 ? "Approve site-visit reply" : "Approve quote"}
          />
        </div>

        <aside className="min-w-0 space-y-6">
          <CustomerPanel customer={customer} matchReason={quote.customerMatchReason} senderName={quote.senderName} senderEmail={quote.senderEmail} />
          <ReviewPanel flags={quote.flags} />
          <MeasurementsPanel measurements={quote.measurements} />
          <Card>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                <span className="flex size-8 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                  <FileText className="size-4" />
                </span>
                <span className="flex-1 text-[15px] font-semibold text-stone-900">Original enquiry</span>
                <span className="text-xs text-stone-400 group-open:hidden">Show</span>
                <span className="hidden text-xs text-stone-400 group-open:inline">Hide</span>
              </summary>
              <pre className="max-h-96 overflow-auto border-t border-stone-100 px-5 py-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-stone-600">{quote.enquiryText}</pre>
            </details>
          </Card>
        </aside>
      </div>
    </>
  );
}
