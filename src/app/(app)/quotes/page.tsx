import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, FilePlus2, MapPin, PoundSterling } from "lucide-react";
import Link from "next/link";
import { Badge, buttonClass, Card, EmptyState, PageHeader, StatCard, tableClass } from "@/components/ui";
import { formatGBP } from "@/core/money";
import { formatRelative } from "@/lib/format";
import { requireTenant } from "@/server/auth/session";
import { listQuotes } from "@/server/repos/quotes";
import { OutcomeBadge, StatusBadge } from "./quote-badges";

export default async function QuotesPage() {
  const tenant = await requireTenant();
  const quotes = await listQuotes(tenant.companyId);

  const drafts = quotes.filter((q) => q.status === "draft");
  const approved = quotes.filter((q) => q.status === "approved");
  const siteVisits = drafts.filter((q) => q.outcome === "site_visit");
  const approvedValue = approved.reduce((sum, q) => sum + q.totalPence, 0);

  const newQuote = (
    <Link href="/quotes/new" className={buttonClass("brand")}>
      <FilePlus2 className="size-4" /> New quote
    </Link>
  );

  return (
    <>
      <PageHeader title="Quotes" description="Drafted from customer enquiries. Nothing is sent until someone here approves it." actions={newQuote} />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Waiting for review" value={drafts.length} icon={ClipboardList} tone="blue" />
        <StatCard label="Need a site visit" value={siteVisits.length} icon={MapPin} tone="amber" />
        <StatCard label="Approved" value={approved.length} icon={CheckCircle2} tone="brand" />
        <StatCard label="Approved value" value={formatGBP(approvedValue)} hint="inc VAT" icon={PoundSterling} />
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="No quotes yet"
          description="Paste a customer's email and you'll get a draft quote, priced from your own list, ready to check."
          action={newQuote}
        />
      ) : (
        <Card>
          <div className={tableClass.wrap}>
            <table className={tableClass.table}>
              <thead className={tableClass.head}>
                <tr>
                  <th className={tableClass.th}>Enquiry</th>
                  <th className={tableClass.th}>Status</th>
                  <th className={`${tableClass.th} text-right`}>Total</th>
                  <th className={`${tableClass.th} text-right`}>Created</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className={tableClass.body}>
                {quotes.map((q) => {
                  const toCheck = q.status === "draft" ? q.flags.filter((f) => f.severity !== "info").length : 0;
                  return (
                    <tr key={q.id} className="group relative transition hover:bg-stone-50/80">
                      <td className={tableClass.td}>
                        <Link href={`/quotes/${q.id}`} className="font-medium text-stone-900 after:absolute after:inset-0">
                          {q.subject ?? "Untitled enquiry"}
                        </Link>
                        <div className="mt-0.5 text-[13px] text-stone-500">{q.customerName ?? q.senderName ?? "Unknown sender"}</div>
                      </td>
                      <td className={tableClass.td}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={q.status} />
                          <OutcomeBadge outcome={q.outcome} />
                          {toCheck > 0 && (
                            <Badge tone="red">
                              <AlertTriangle className="size-3" /> {toCheck} to check
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className={`${tableClass.td} text-right font-medium tabular-nums`}>
                        {q.totalPence > 0 ? formatGBP(q.totalPence) : <span className="text-stone-400">–</span>}
                      </td>
                      <td className={`${tableClass.td} text-right whitespace-nowrap text-stone-500`}>{formatRelative(q.createdAt)}</td>
                      <td className="pr-4 text-stone-300 transition group-hover:text-stone-500">
                        <ChevronRight className="size-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
