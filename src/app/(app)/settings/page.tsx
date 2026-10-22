import { Ban, Building2, CircleCheck, KeyRound, MapPin, PoundSterling, Receipt, ScrollText } from "lucide-react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { formatGBP } from "@/core/money";
import { formatDateTime } from "@/lib/format";
import { requireTenant } from "@/server/auth/session";
import { getCompany } from "@/server/repos/companies";
import { getCredentialSummary } from "@/server/repos/credentials";
import { removeApiKey } from "./actions";
import { CredentialForm } from "./credential-form";

function Rule({ icon: Icon, label, children }: { icon: typeof Ban; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] text-stone-500">{label}</div>
        <div className="text-sm font-medium text-stone-900">{children}</div>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const tenant = await requireTenant();
  const [credential, company] = await Promise.all([getCredentialSummary(tenant.companyId), getCompany(tenant.companyId)]);
  const { policy } = company;

  return (
    <>
      <PageHeader title="Settings" description={`Settings for ${company.name}. Nobody outside your company can see or use these.`} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader
            icon={KeyRound}
            title="AI provider"
            description="Your company's own key is used for your quotes, and usage is billed to your provider account."
            action={credential ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="amber" dot>Not set up</Badge>}
          />
          <CardBody className="space-y-6">
            {credential ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CircleCheck className="size-5 text-brand-600" />
                  <div className="text-sm">
                    <div className="font-medium text-stone-900">
                      <span className="capitalize">{credential.provider}</span> · {credential.model}
                    </div>
                    <div className="text-stone-500">
                      Key <code className="text-stone-700">{credential.keyHint}</code> · updated {formatDateTime(credential.updatedAt)}
                    </div>
                  </div>
                </div>
                <form action={removeApiKey}>
                  <Button variant="danger" size="sm" type="submit">
                    Remove key
                  </Button>
                </form>
              </div>
            ) : (
              <Alert tone="amber" icon={KeyRound} title="No key saved yet">
                Quotes can&apos;t be drafted until one is added.
              </Alert>
            )}
            <CredentialForm current={credential ? { provider: credential.provider, model: credential.model } : null} />
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader icon={ScrollText} title="Quoting rules" description="Applied by the app to every draft. The AI can't override them." />
          <CardBody className="divide-y divide-stone-100 py-1">
            <Rule icon={Building2} label="Company">
              {company.name}
            </Rule>
            <Rule icon={PoundSterling} label="Minimum charge">
              {formatGBP(policy.minimumChargePence)} ex VAT
            </Rule>
            <Rule icon={Receipt} label="VAT">
              {policy.vatRate * 100}%, quoted ex VAT and shown separately
            </Rule>
            <Rule icon={MapPin} label="Site visit required">
              Areas over {policy.siteVisitAreaM2} m²{policy.siteVisitForCommercial ? " and all commercial jobs" : ""}
            </Rule>
            <Rule icon={Ban} label="Work we don't do">
              {policy.notOffered.map((s) => s.service).join(", ") || "None"}
            </Rule>
            <Rule icon={ScrollText} label="Quotes valid for">
              {policy.quoteValidityDays} days
            </Rule>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
