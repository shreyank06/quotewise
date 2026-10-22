import {
  Ban,
  CircleHelp,
  ClipboardCheck,
  Info,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircleQuestion,
  Receipt,
  Ruler,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Alert, Avatar, Badge, Card, CardBody, CardHeader } from "@/components/ui";
import type { FlagKind, NormalisedMeasurement, QuoteFlag } from "@/core/quote-builder";
import type { CustomerRow } from "@/server/repos/customers";

const ATTENTION: Partial<Record<FlagKind, { title: string; icon: LucideIcon }>> = {
  injection: { title: "Instructions hidden in the email", icon: ShieldAlert },
  site_visit: { title: "Site visit needed", icon: MapPin },
  not_offered: { title: "Not something we do", icon: Ban },
  no_rate: { title: "Not on the price list", icon: CircleHelp },
  unclear: { title: "Unclear", icon: CircleHelp },
  rejected_line: { title: "AI suggestion removed", icon: TriangleAlert },
  quantity: { title: "Check the quantity", icon: Ruler },
  minimum_charge: { title: "Minimum charge applied", icon: Info },
};

function Section({ title, icon: Icon, count, children }: { title: string; icon: LucideIcon; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
        <Icon className="size-3.5" />
        {title}
        <span className="rounded-full bg-stone-100 px-1.5 text-[11px] text-stone-600">{count}</span>
      </h3>
      {children}
    </section>
  );
}

/** Groups the builder's flags into what a reviewer actually does with them. */
export function ReviewPanel({ flags }: { flags: QuoteFlag[] }) {
  const blockFirst = (f: QuoteFlag) => (f.severity === "block" ? 0 : 1);
  const attention = flags.filter((f) => f.severity !== "info").sort((a, b) => blockFirst(a) - blockFirst(b));
  const notes = flags.filter((f) => f.severity === "info" && f.kind !== "assumption" && f.kind !== "question");
  const questions = flags.filter((f) => f.kind === "question");
  const assumptions = flags.filter((f) => f.kind === "assumption");

  return (
    <Card>
      <CardHeader
        icon={ClipboardCheck}
        title="Review checklist"
        description={attention.length ? `${attention.length} thing${attention.length === 1 ? "" : "s"} to check before approving` : "Nothing flagged. Give it a once-over."}
      />
      <CardBody className="space-y-6">
        {attention.length > 0 && (
          <div className="space-y-2">
            {attention.map((f, i) => {
              const meta = ATTENTION[f.kind] ?? { title: "Check", icon: TriangleAlert };
              return (
                <Alert key={i} tone={f.severity === "block" ? "red" : "amber"} icon={meta.icon} title={meta.title}>
                  {f.message}
                </Alert>
              );
            })}
          </div>
        )}

        {questions.length > 0 && (
          <Section title="Ask the customer" icon={MessageCircleQuestion} count={questions.length}>
            <ol className="space-y-2 text-sm text-stone-700">
              {questions.map((q, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[11px] font-semibold text-sky-700">{i + 1}</span>
                  <span className="leading-relaxed">{q.message}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {assumptions.length > 0 && (
          <Section title="Assumptions made" icon={Lightbulb} count={assumptions.length}>
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-stone-600">
              {assumptions.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-stone-400" />
                  {a.message}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {notes.length > 0 && (
          <Section title="Notes" icon={Info} count={notes.length}>
            <ul className="space-y-2 text-[13px] leading-relaxed text-stone-600">
              {notes.map((n, i) => (
                <li key={i} className="rounded-lg bg-stone-50 px-3 py-2">
                  {n.message}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </CardBody>
    </Card>
  );
}

function Detail({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 text-sm text-stone-600">
      <Icon className="mt-0.5 size-4 shrink-0 text-stone-400" />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function CustomerPanel({
  customer,
  matchReason,
  senderName,
  senderEmail,
}: {
  customer: CustomerRow | null;
  matchReason: string | null;
  senderName: string | null;
  senderEmail: string | null;
}) {
  const name = customer?.name ?? senderName ?? senderEmail ?? "Unknown sender";
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={name} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-stone-900">{name}</div>
            {customer?.company && <div className="truncate text-sm text-stone-500">{customer.company}</div>}
          </div>
          {customer ? <Badge tone="green">On file</Badge> : <Badge tone="blue">New customer</Badge>}
        </div>
        <div className="space-y-2">
          {senderEmail && <Detail icon={Mail}>{senderEmail}</Detail>}
          {customer?.address && <Detail icon={MapPin}>{customer.address}</Detail>}
          {customer?.billingEmail && <Detail icon={Receipt}>Invoices to {customer.billingEmail}</Detail>}
        </div>
        {customer && customer.notes.length > 0 && (
          <div className="rounded-lg bg-stone-50 px-3 py-2.5 text-[13px] leading-relaxed text-stone-600">{customer.notes.join(" · ")}</div>
        )}
        {matchReason && <p className="text-xs text-stone-400">{matchReason}</p>}
        {!customer && <p className="text-xs text-stone-400">They&apos;ll be added to your customer list when this quote is approved.</p>}
      </CardBody>
    </Card>
  );
}

export function MeasurementsPanel({ measurements }: { measurements: NormalisedMeasurement[] }) {
  if (measurements.length === 0) return null;
  return (
    <Card>
      <CardHeader icon={Ruler} title="Measurements" description="As written by the customer, converted by the app" />
      <ul className="divide-y divide-stone-100">
        {measurements.map((m) => {
          const converted = [m.areaM2 !== null && `${m.areaM2} m²`, m.kind === "length" && m.lengthM !== null && `${m.lengthM} m`].filter(Boolean).join(", ");
          return (
            <li key={m.id} className="px-5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-stone-800 first-letter:uppercase">{m.label}</span>
                <span className="text-sm font-semibold whitespace-nowrap text-stone-900 tabular-nums">{converted || "–"}</span>
              </div>
              <div className="mt-0.5 text-[13px] text-stone-500">
                “{m.sourceText}”{m.approximate && <span className="ml-1.5 text-amber-700">approx.</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
