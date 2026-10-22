"use server";

import { revalidatePath } from "next/cache";
import { CsvError } from "@/core/import/csv";
import { errorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireTenant } from "@/server/auth/session";
import { readCsvUpload, UploadError } from "@/server/csv-upload";
import { importCustomersCsv } from "@/server/services/import-service";

export async function importCustomersAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const tenant = await requireTenant();
  try {
    const summary = await importCustomersCsv(tenant.companyId, await readCsvUpload(formData));
    revalidatePath("/customers");
    return ok(summary.message);
  } catch (error) {
    return fail(errorMessage(error, [UploadError, CsvError]));
  }
}
