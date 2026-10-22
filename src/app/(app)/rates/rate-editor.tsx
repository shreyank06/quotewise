"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { RATE_UNITS } from "@/core/units";
import { saveRate } from "./actions";

const STATUSES = [
  ["active", "Active"],
  ["needs_review", "Needs review"],
  ["superseded", "Superseded"],
  ["not_offered", "Not offered"],
] as const;

const control = "h-8 rounded-md border border-stone-200 bg-white px-2 text-[13px] shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function RateEditor({ rate }: { rate: { id: string; ratePence: number | null; unit: string | null; status: string } }) {
  const [state, action, pending] = useActionState(saveRate, null);
  return (
    <form action={action} className="flex flex-nowrap items-center gap-1.5">
      <input type="hidden" name="rateId" value={rate.id} />
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[13px] text-stone-400">£</span>
        <input
          name="price"
          defaultValue={rate.ratePence !== null ? (rate.ratePence / 100).toFixed(2) : ""}
          placeholder="TBC"
          inputMode="decimal"
          aria-label="Price ex VAT"
          className={`${control} w-24 pl-5 text-right tabular-nums`}
        />
      </div>
      <select name="unit" defaultValue={rate.unit ?? ""} aria-label="Unit" className={control}>
        {rate.unit === null && <option value="">?</option>}
        {RATE_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
      <select name="status" defaultValue={rate.status} aria-label="Status" className={control}>
        {STATUSES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="h-8 rounded-md px-2.5 text-[13px] font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state &&
        (state.ok ? (
          <Check className="size-4 text-brand-600" aria-label="Saved" />
        ) : (
          <span className="text-xs text-red-700">{state.message}</span>
        ))}
    </form>
  );
}
