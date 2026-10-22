"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { FilterTabs, SearchInput } from "@/components/filter-tabs";
import { Badge, Card, type BadgeTone } from "@/components/ui";
import type { RateStatus } from "@/core/import/rates";
import { RateEditor } from "./rate-editor";

export type RateView = {
  id: string;
  code: string;
  item: string;
  unit: string | null;
  unitRaw: string;
  ratePence: number | null;
  rateRaw: string;
  notes: string;
  status: RateStatus;
  issues: string[];
};

const STATUS: Record<RateStatus, { tone: BadgeTone; label: string }> = {
  active: { tone: "green", label: "Active" },
  needs_review: { tone: "amber", label: "Needs review" },
  superseded: { tone: "neutral", label: "Superseded" },
  not_offered: { tone: "red", label: "Not offered" },
};

type Filter = "all" | RateStatus;

export function RatesTable({ rates }: { rates: RateView[] }) {
  const reviewCount = rates.filter((r) => r.status === "needs_review").length;
  const [filter, setFilter] = useState<Filter>(reviewCount > 0 ? "needs_review" : "all");
  const [query, setQuery] = useState("");

  const count = (s: Filter) => (s === "all" ? rates.length : rates.filter((r) => r.status === s).length);
  const q = query.trim().toLowerCase();
  const visible = rates.filter((r) => (filter === "all" || r.status === filter) && (!q || `${r.code} ${r.item} ${r.notes}`.toLowerCase().includes(q)));

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All", count: count("all") },
            { value: "needs_review", label: "Needs review", count: count("needs_review") },
            { value: "active", label: "Active", count: count("active") },
            { value: "superseded", label: "Superseded", count: count("superseded") },
            { value: "not_offered", label: "Not offered", count: count("not_offered") },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search rates" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-100 text-left text-xs font-medium text-stone-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Item</th>
              <th className="px-3 py-2.5 font-medium">In the spreadsheet</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium">Price (ex VAT) · unit · status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-stone-500">
                  No rates match.
                </td>
              </tr>
            )}
            {visible.map((rate) => (
              <tr key={rate.id} className="align-top">
                <td className="px-5 py-3">
                  <div className="flex items-baseline gap-2">
                    <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">{rate.code}</code>
                    <span className="font-medium text-stone-900">{rate.item}</span>
                  </div>
                  {rate.issues.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {rate.issues.map((issue) => (
                        <li key={issue} className="flex gap-1.5 text-[13px] text-amber-800">
                          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-3 py-3 text-[13px] text-stone-500">
                  <div className="whitespace-nowrap tabular-nums">
                    {rate.rateRaw || "blank"} / {rate.unitRaw || "?"}
                  </div>
                  {rate.notes && <div className="mt-0.5 max-w-48 italic">“{rate.notes}”</div>}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={STATUS[rate.status].tone} dot>
                    {STATUS[rate.status].label}
                  </Badge>
                </td>
                <td className="px-5 py-2.5 whitespace-nowrap">
                  <RateEditor rate={rate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
