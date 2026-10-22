import { TriangleAlert, Upload } from "lucide-react";
import { CsvImportForm } from "@/components/csv-import-form";
import { Alert, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { requireTenant } from "@/server/auth/session";
import { listRates } from "@/server/repos/rates";
import { importRatesAction } from "./actions";
import { RatesTable } from "./rates-table";

export default async function RatesPage() {
  const tenant = await requireTenant();
  const rates = await listRates(tenant.companyId);
  const reviewCount = rates.filter((r) => r.status === "needs_review").length;

  return (
    <>
      <PageHeader title="Price list" description="All prices are ex VAT. Only active rates are used for quotes. Anything flagged for review stays hidden from the AI until someone here confirms it." />

      {reviewCount > 0 && (
        <Alert tone="amber" icon={TriangleAlert} title={`${reviewCount} rate${reviewCount === 1 ? "" : "s"} from the spreadsheet need checking`} className="mb-6">
          The reason is listed under each one. Fix the price, unit or status and save, and it becomes available for quotes.
        </Alert>
      )}

      <div className="space-y-6">
        <RatesTable rates={rates} />

        <Card>
          <CardHeader icon={Upload} title="Re-import from a spreadsheet" description="CSV with columns Code, Item, Unit, Rate, Notes. This replaces the current list." />
          <CardBody>
            <CsvImportForm
              action={importRatesAction}
              label="Import rates"
              confirmText="This replaces the whole price list, including any fixes made here. Existing quotes keep their prices. Continue?"
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
