import { cx } from "./ui";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <span className={cx("flex size-8 items-center justify-center rounded-lg", inverted ? "bg-white/10" : "bg-brand-700")}>
        <svg viewBox="0 0 24 24" className="size-[18px] text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 18h16" />
          <path d="M6 18V9l6-4 6 4v9" />
          <path d="M10 18v-5h4v5" />
        </svg>
      </span>
      <span className={cx("text-[17px] font-semibold tracking-tight", inverted ? "text-white" : "text-stone-900")}>Quotewise</span>
    </span>
  );
}
