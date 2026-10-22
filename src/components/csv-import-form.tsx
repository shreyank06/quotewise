"use client";

import { FileSpreadsheet } from "lucide-react";
import { useActionState, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { Button, FormMessage } from "./ui";

export function CsvImportForm({
  action: importAction,
  label,
  confirmText,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  label: string;
  confirmText?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  // React clears the file input after the action, so clear the label with it.
  const [state, action, pending] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await importAction(prev, formData);
    setFileName(null);
    return result;
  }, null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmText && !confirm(confirmText)) e.preventDefault();
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 text-sm text-stone-600 transition hover:border-stone-400 hover:bg-white">
          <FileSpreadsheet className="size-4 text-stone-400" />
          <span className="max-w-64 truncate">{fileName ?? "Choose CSV file…"}</span>
          <input name="file" type="file" accept=".csv,text/csv" required className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
        </label>
        <Button type="submit" variant="secondary" disabled={pending || !fileName}>
          {pending ? "Importing…" : label}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
