"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseMoney } from "@/core/money";
import { RATE_UNITS } from "@/core/units";
import { CsvError } from "@/core/import/csv";
import { errorMessage, fail, ok, type ActionResult } from "@/lib/action-result";
import { requireTenant } from "@/server/auth/session";
import { updateRate } from "@/server/repos/rates";
import { readCsvUpload, UploadError } from "@/server/csv-upload";
import { importRatesCsv } from "@/server/services/import-service";

const RateEditSchema = z.object({
  rateId: z.string().uuid(),
  price: z.string().trim().max(20),
  unit: z.enum(RATE_UNITS),
  status: z.enum(["active", "superseded", "needs_review", "not_offered"]),
});

export async function saveRate(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const tenant = await requireTenant();
  const parsed = RateEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Check the values entered.");
  const ratePence = parsed.data.price ? parseMoney(parsed.data.price) : null;
  if (parsed.data.price && ratePence === null) return fail("Price must be a number, e.g. 62 or 14.50.");
  if (parsed.data.status === "active" && ratePence === null) return fail("An active rate needs a price.");

  try {
    await updateRate(tenant.companyId, parsed.data.rateId, { ratePence, status: parsed.data.status, unit: parsed.data.unit });
  } catch (error) {
    return fail(errorMessage(error));
  }
  revalidatePath("/rates");
  return ok("Saved");
}

export async function importRatesAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const tenant = await requireTenant();
  try {
    const summary = await importRatesCsv(tenant.companyId, await readCsvUpload(formData));
    revalidatePath("/rates");
    return ok(summary.message);
  } catch (error) {
    return fail(errorMessage(error, [UploadError, CsvError]));
  }
}
