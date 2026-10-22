"use client";

import { cx } from "./ui";

export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition",
            value === t.value ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800",
          )}
        >
          {t.label}
          <span className={cx("rounded-full px-1.5 text-[11px]", value === t.value ? "bg-stone-100 text-stone-700" : "text-stone-400")}>{t.count}</span>
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-stone-200 bg-white pr-3 pl-9 text-sm shadow-sm outline-none placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-64"
      />
    </div>
  );
}
