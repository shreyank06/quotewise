import { Upload } from "lucide-react";
import { CsvImportForm } from "@/components/csv-import-form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { requireTenant } from "@/server/auth/session";
import { listCustomers } from "@/server/repos/customers";
import { importCustomersAction } from "./actions";
import { CustomersTable } from "./customers-table";

export default async function CustomersPage() {
  const tenant = await requireTenant();
  const customers = await listCustomers(tenant.companyId);

  return (
    <>
      <PageHeader title="Customers" description="Used to recognise repeat customers when an enquiry comes in. Duplicate rows from the spreadsheet were merged on import." />
      <div className="space-y-6">
        <CustomersTable
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            company: c.company,
            emails: c.emails,
            billingEmail: c.billingEmail,
            phones: c.phones,
            address: c.address,
            notes: c.notes,
          }))}
        />
        <Card>
          <CardHeader icon={Upload} title="Import customers" description="CSV with columns Name, Company, Email, Phone, Address, Notes. Anyone already on file is skipped." />
          <CardBody>
            <CsvImportForm action={importCustomersAction} label="Import customers" />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
