"use client";

import { Check, ListPlus, Plus, Save, Sparkles, Trash2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge, Button, Card, CardBody, CardHeader, FormMessage, inputClass } from "@/components/ui";
import { formatGBP, parseMoney } from "@/core/money";
import type { QuotePolicy } from "@/core/policy";
import { lineTotal, priceQuote, type LineSource } from "@/core/pricing";
import type { PriceableRate } from "@/core/quote-builder";
import type { ActionResult } from "@/lib/action-result";
import { discard, saveAndApproveQuote, saveQuote } from "./actions";

export type EditorLine = {
  id: string | null;
  rateCode: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPricePence: number;
  source: LineSource;
  rationale: string | null;
  edited: boolean;
};

type DraftLine = Omit<EditorLine, "quantity" | "unitPricePence"> & { key: string; quantity: string; price: string };

const toDraft = (l: EditorLine, i: number): DraftLine => ({
  ...l,
  key: l.id ?? `new-${i}`,
  quantity: String(l.quantity),
  price: (l.unitPricePence / 100).toFixed(2),
});

let keySeq = 0;

function SourceTag({ line }: { line: DraftLine }) {
  if (line.source === "human") return <Badge>Added by you</Badge>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700">
      <Sparkles className="size-3" /> AI suggested
    </span>
  );
}

export function QuoteEditor(props: {
  quoteId: string;
  editable: boolean;
  lines: EditorLine[];
  policy: QuotePolicy;
  rates: PriceableRate[];
  customers: { id: string; label: string }[];
  customerId: string | null;
  reviewerNotes: string;
  blockingFlags: number;
  approveLabel: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<DraftLine[]>(() => props.lines.map(toDraft));
  const [customerId, setCustomerId] = useState(props.customerId ?? "");
  const [notes, setNotes] = useState(props.reviewerNotes);
  const [acknowledged, setAcknowledged] = useState(props.blockingFlags === 0);
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, startTransition] = useTransition();
  const [addCode, setAddCode] = useState("");
  const [dirty, setDirty] = useState(false);

  const parsed = lines.map((l) => ({ ...l, qty: Number(l.quantity), pence: parseMoney(l.price) }));
  const invalid = parsed.some((l) => !(l.qty > 0) || l.pence === null || !l.description.trim());

  // Preview only. The server recomputes totals from the same pricing code on save.
  const totals = priceQuote(
    parsed.filter((l) => l.qty > 0 && l.pence !== null).map((l) => ({ ...l, quantity: l.qty, unitPricePence: l.pence! })),
    props.policy,
  );

  const change = (fn: (ls: DraftLine[]) => DraftLine[]) => {
    setLines(fn);
    setDirty(true);
    setResult(null);
  };
  const update = (key: string, patch: Partial<DraftLine>) => change((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const addFromRate = (code: string) => {
    const rate = props.rates.find((r) => r.code === code);
    if (!rate) return;
    change((ls) => [
      ...ls,
      { key: `new-${++keySeq}`, id: null, rateCode: rate.code, description: rate.item, unit: rate.unit, quantity: "1", price: (rate.ratePence / 100).toFixed(2), source: "human", rationale: null, edited: false },
    ]);
    setAddCode("");
  };

  const addCustom = () =>
    change((ls) => [...ls, { key: `new-${++keySeq}`, id: null, rateCode: null, description: "", unit: "each", quantity: "1", price: "0.00", source: "human", rationale: null, edited: false }]);

  const payload = () => ({
    reviewerNotes: notes,
    customerId: customerId || null,
    lines: parsed.map((l) => ({ id: l.id, rateCode: l.rateCode, description: l.description.trim(), unit: l.unit.trim(), quantity: l.qty, unitPricePence: l.pence ?? 0 })),
  });

  const act = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const r = await fn();
      setResult(r);
      if (r?.ok) {
        setDirty(false);
        router.refresh();
      }
    });

  const readOnly = !props.editable || pending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Line items"
          description={props.editable ? "Prices come from your price list. Click any value to change it." : "This quote is locked."}
          action={<span className="text-sm text-stone-500">{lines.length} item{lines.length === 1 ? "" : "s"}</span>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 text-left text-xs font-medium text-stone-500">
              <tr>
                <th className="py-2.5 pr-2 pl-5 font-medium">Item</th>
                <th className="w-20 px-2 py-2.5 text-right font-medium">Qty</th>
                <th className="w-16 px-2 py-2.5 font-medium">Unit</th>
                <th className="w-24 px-2 py-2.5 text-right font-medium">Rate (£)</th>
                <th className="w-28 px-2 py-2.5 text-right font-medium">Amount</th>
                {props.editable && <th className="w-12 pr-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lines.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-stone-500">
                    Nothing priced yet.{props.editable && " Add items below if you want to price this anyway."}
                  </td>
                </tr>
              )}
              {parsed.map((l, i) => (
                <tr key={l.key} className="group align-top">
                  <td className="py-2.5 pr-2 pl-3">
                    <textarea
                      rows={1}
                      value={l.description}
                      onChange={(e) => update(l.key, { description: e.target.value })}
                      readOnly={readOnly}
                      aria-label={`Line ${i + 1} description`}
                      aria-invalid={!l.description.trim()}
                      className="cell-input min-w-60 resize-none font-medium text-stone-900 [field-sizing:content]"
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-2 px-2 text-xs text-stone-500">
                      {l.rateCode && <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">{l.rateCode}</code>}
                      <SourceTag line={l} />
                      {l.edited && <Badge tone="amber">Edited</Badge>}
                    </div>
                    {l.rationale && <p className="mt-1 max-w-xl px-2 text-[13px] leading-relaxed text-stone-500">{l.rationale}</p>}
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      value={l.quantity}
                      onChange={(e) => update(l.key, { quantity: e.target.value })}
                      readOnly={readOnly}
                      inputMode="decimal"
                      aria-label={`Line ${i + 1} quantity`}
                      aria-invalid={!(l.qty > 0)}
                      className="cell-input text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      value={l.unit}
                      onChange={(e) => update(l.key, { unit: e.target.value })}
                      readOnly={readOnly || l.rateCode !== null}
                      aria-label={`Line ${i + 1} unit`}
                      className="cell-input text-stone-600"
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <input
                      value={l.price}
                      onChange={(e) => update(l.key, { price: e.target.value })}
                      readOnly={readOnly}
                      inputMode="decimal"
                      aria-label={`Line ${i + 1} rate in pounds`}
                      aria-invalid={l.pence === null}
                      className="cell-input text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-4 text-right font-medium text-stone-900 tabular-nums">{l.qty > 0 && l.pence !== null ? formatGBP(lineTotal(l.qty, l.pence)) : "–"}</td>
                  {props.editable && (
                    <td className="pt-3 pr-3 text-right">
                      <button
                        type="button"
                        onClick={() => change((ls) => ls.filter((x) => x.key !== l.key))}
                        disabled={pending}
                        aria-label={`Remove line ${i + 1}`}
                        className="rounded-md p-1.5 text-stone-300 transition group-hover:text-stone-400 hover:!bg-red-50 hover:!text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-6 border-t border-stone-100 px-5 py-4 md:flex-row md:items-start md:justify-between">
          {props.editable ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full max-w-72">
                <ListPlus className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
                <select
                  value={addCode}
                  onChange={(e) => {
                    setAddCode(e.target.value);
                    addFromRate(e.target.value);
                  }}
                  aria-label="Add an item from the price list"
                  className={`${inputClass} h-9 w-full max-w-72 appearance-none py-0 pl-9`}
                >
                  <option value="">Add from price list…</option>
                  {props.rates.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code} · {r.item} ({formatGBP(r.ratePence)}/{r.unit})
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="ghost" icon={Plus} onClick={addCustom}>
                Custom item
              </Button>
            </div>
          ) : (
            <span />
          )}

          <dl className="w-full shrink-0 space-y-1.5 text-sm whitespace-nowrap md:w-64">
            <div className="flex justify-between text-stone-600">
              <dt>Work</dt>
              <dd className="tabular-nums">{formatGBP(totals.workSubtotalPence)}</dd>
            </div>
            {totals.minimumChargeAdjustmentPence > 0 && (
              <div className="flex justify-between text-stone-600">
                <dt>Minimum charge top-up</dt>
                <dd className="tabular-nums">{formatGBP(totals.minimumChargeAdjustmentPence)}</dd>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <dt>Subtotal (ex VAT)</dt>
              <dd className="tabular-nums">{formatGBP(totals.subtotalPence)}</dd>
            </div>
            <div className="flex justify-between text-stone-600">
              <dt>VAT {props.policy.vatRate * 100}%</dt>
              <dd className="tabular-nums">{formatGBP(totals.vatPence)}</dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2.5 text-base font-semibold text-stone-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatGBP(totals.totalPence)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card>
        <CardHeader icon={UserRound} title="Customer and notes" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-800">Customer</span>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setDirty(true);
              }}
              disabled={readOnly}
              className={inputClass}
            >
              <option value="">New customer (added when approved)</option>
              {props.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-stone-800">Internal notes</span>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              readOnly={readOnly}
              rows={2}
              placeholder="Only visible to your team"
              className={inputClass}
            />
          </label>
        </CardBody>
      </Card>

      {props.editable && (
        <div className="sticky bottom-4 z-10">
          <Card className="border-stone-300/80 shadow-lg shadow-stone-900/5">
            <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 space-y-1">
                {props.blockingFlags > 0 ? (
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm text-stone-700">
                    <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5 size-4 accent-brand-600" />
                    <span>I&apos;ve checked the warnings and I&apos;m happy to approve this.</span>
                  </label>
                ) : (
                  <span className="text-sm text-stone-600">
                    Total <strong className="text-stone-900 tabular-nums">{formatGBP(totals.totalPence)}</strong> inc VAT
                    {dirty && <span className="ml-2 text-amber-700">· unsaved changes</span>}
                  </span>
                )}
                {invalid && <p className="text-sm text-red-700">Fix the highlighted values first.</p>}
                <FormMessage state={result} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="danger"
                  icon={X}
                  disabled={pending}
                  onClick={() => confirm("Discard this draft? It stays in your list marked as discarded.") && act(() => discard(props.quoteId))}
                >
                  Discard
                </Button>
                <Button type="button" variant="secondary" icon={Save} disabled={pending || invalid || !dirty} onClick={() => act(() => saveQuote(props.quoteId, payload()))}>
                  Save draft
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  icon={Check}
                  disabled={pending || invalid || !acknowledged}
                  onClick={() => act(() => saveAndApproveQuote(props.quoteId, payload()))}
                >
                  {pending ? "Saving…" : props.approveLabel}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
