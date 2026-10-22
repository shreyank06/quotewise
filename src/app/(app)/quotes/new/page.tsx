import { ArrowLeft, KeyRound, ListChecks, ScanText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Alert, buttonClass, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { requireTenant } from "@/server/auth/session";
import { getCredentialSummary } from "@/server/repos/credentials";
import { NewQuoteForm } from "./new-quote-form";

const STEPS = [
  { icon: ScanText, title: "The AI reads the enquiry", text: "Works out the job, the sizes (in whatever units were used) and anything it can't price." },
  { icon: ListChecks, title: "Priced from your list", text: "Only your active rates are used. VAT and your minimum charge are added by the app, not the AI." },
  { icon: ShieldCheck, title: "You check and approve", text: "You'll see anything that needs a second look. Nothing is sent from here." },
];

export default async function NewQuotePage() {
  const tenant = await requireTenant();
  const credential = await getCredentialSummary(tenant.companyId);

  return (
    <>
      <Link href="/quotes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="size-4" /> Quotes
      </Link>
      <PageHeader title="New quote" description="Paste the customer's email or website form. Include the From line if you have it, so we can recognise repeat customers." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {credential ? (
            <NewQuoteForm />
          ) : (
            <Alert tone="amber" icon={KeyRound} title="Add your AI key first">
              Quotes are drafted with your company&apos;s own AI account.{" "}
              <Link href="/settings" className={buttonClass("secondary", "sm", "mt-3")}>
                Go to Settings
              </Link>
            </Alert>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader title="What happens next" />
          <CardBody>
            <ol className="space-y-5">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-stone-900">
                      {i + 1}. {title}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-stone-500">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
