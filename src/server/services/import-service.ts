import { importCustomers } from "@/core/import/customers";
import { importRates } from "@/core/import/rates";
import { addImportedCustomers } from "../repos/customers";
import { replaceRates } from "../repos/rates";

export type ImportSummary = { message: string };

const MAX_CSV_BYTES = 1_000_000;

function guardSize(csv: string) {
  if (csv.length > MAX_CSV_BYTES) throw new Error("CSV is too large (1 MB max).");
}

export async function importRatesCsv(companyId: string, csv: string): Promise<ImportSummary> {
  guardSize(csv);
  const imported = importRates(csv);
  await replaceRates(companyId, imported);
  const count = (s: string) => imported.filter((r) => r.status === s).length;
  return {
    message: `Imported ${imported.length} rates: ${count("active")} active, ${count("needs_review")} need review, ${count("superseded")} superseded, ${count("not_offered")} not offered.`,
  };
}

export async function importCustomersCsv(companyId: string, csv: string): Promise<ImportSummary> {
  guardSize(csv);
  const imported = importCustomers(csv);
  const { added, skipped } = await addImportedCustomers(companyId, imported);
  const merged = imported.filter((c) => c.sourceRows.length > 1).length;
  return { message: `Added ${added} customers (${merged} merged from duplicate rows), skipped ${skipped} already on file.` };
}
