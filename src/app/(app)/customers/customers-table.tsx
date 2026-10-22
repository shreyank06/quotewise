"use client";

import { useState } from "react";
import { SearchInput } from "@/components/filter-tabs";
import { Avatar, Badge, Card } from "@/components/ui";

export type CustomerView = {
  id: string;
  name: string;
  company: string | null;
  emails: string[];
  billingEmail: string | null;
  phones: string[];
  address: string | null;
  notes: string[];
};

export function CustomersTable({ customers }: { customers: CustomerView[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = customers.filter((c) => !q || [c.name, c.company, c.address, ...c.emails, ...c.notes].join(" ").toLowerCase().includes(q));

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-3">
        <span className="text-sm text-stone-500">
          {visible.length} of {customers.length} customers
        </span>
        <SearchInput value={query} onChange={setQuery} placeholder="Search customers" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-100 text-left text-xs font-medium text-stone-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Customer</th>
              <th className="px-3 py-2.5 font-medium">Contact</th>
              <th className="px-3 py-2.5 font-medium">Address</th>
              <th className="px-5 py-2.5 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-stone-500">
                  No customers match.
                </td>
              </tr>
            )}
            {visible.map((c) => {
              const merged = c.notes.some((n) => n.startsWith("Merged from"));
              return (
                <tr key={c.id} className="align-top">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium text-stone-900">{c.name}</div>
                        {c.company && <div className="text-[13px] text-stone-500">{c.company}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-stone-600">
                    {c.emails.map((e) => (
                      <div key={e}>{e}</div>
                    ))}
                    {c.phones.map((p) => (
                      <div key={p} className="text-stone-500 tabular-nums">
                        {p}
                      </div>
                    ))}
                    {c.billingEmail && <div className="mt-1 text-stone-500">Invoices → {c.billingEmail}</div>}
                  </td>
                  <td className="px-3 py-3 text-[13px] text-stone-600">{c.address ?? <span className="text-stone-400">–</span>}</td>
                  <td className="px-5 py-3 text-[13px] text-stone-600">
                    <div className="space-y-1">
                      {merged && <Badge tone="blue">Merged duplicates</Badge>}
                      {c.notes
                        .filter((n) => !n.startsWith("Merged from"))
                        .map((n) => (
                          <div key={n}>{n}</div>
                        ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
