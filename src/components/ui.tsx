import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]", className)} {...props} />;
}

export function CardHeader({ title, description, action, icon: Icon }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
            <Icon className="size-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-stone-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-stone-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("px-5 py-4", className)} {...props} />;
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-stone-900">{title}</h1>
        {description && <div className="mt-1.5 max-w-2xl text-[15px] text-stone-500">{description}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary: "bg-stone-900 text-white shadow-sm hover:bg-stone-800",
  brand: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
  secondary: "border border-stone-200 bg-white text-stone-700 shadow-sm hover:border-stone-300 hover:bg-stone-50",
  ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
  danger: "text-red-700 hover:bg-red-50",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 gap-1.5 px-2.5 text-[13px]",
  md: "h-9 gap-2 px-3.5 text-sm",
  lg: "h-10 gap-2 px-4 text-sm",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function buttonClass(variant: ButtonVariant = "primary", size: keyof typeof BUTTON_SIZES = "md", className?: string) {
  return cx(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  icon: Icon,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: keyof typeof BUTTON_SIZES; icon?: LucideIcon }) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

const BADGE_TONES = {
  neutral: "bg-stone-100 text-stone-700 ring-stone-200",
  green: "bg-brand-50 text-brand-700 ring-brand-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
} as const;
export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "neutral", children, dot }: { tone?: BadgeTone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", BADGE_TONES[tone])}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

const ALERT_TONES = {
  red: { box: "border-red-200 bg-red-50/70 text-red-900", icon: "text-red-600" },
  amber: { box: "border-amber-200 bg-amber-50/70 text-amber-900", icon: "text-amber-600" },
  blue: { box: "border-sky-200 bg-sky-50/70 text-sky-900", icon: "text-sky-600" },
  green: { box: "border-brand-200 bg-brand-50/70 text-brand-900", icon: "text-brand-600" },
  neutral: { box: "border-stone-200 bg-stone-50 text-stone-700", icon: "text-stone-500" },
} as const;

export function Alert({ tone, icon: Icon, title, children, className }: { tone: keyof typeof ALERT_TONES; icon: LucideIcon; title?: ReactNode; children?: ReactNode; className?: string }) {
  const t = ALERT_TONES[tone];
  return (
    <div className={cx("flex gap-3 rounded-lg border px-3.5 py-3 text-sm", t.box, className)}>
      <Icon className={cx("mt-0.5 size-4 shrink-0", t.icon)} />
      <div className="min-w-0 space-y-0.5 break-words">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm transition outline-none placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-stone-50 disabled:text-stone-500";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-800">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state?.message) return null;
  return (
    <p aria-live="polite" className={cx("text-sm font-medium", state.ok ? "text-brand-700" : "text-red-700")}>
      {state.message}
    </p>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: "neutral" | "brand" | "amber" | "blue" }) {
  const toneClass = { neutral: "bg-stone-100 text-stone-600", brand: "bg-brand-50 text-brand-600", amber: "bg-amber-50 text-amber-600", blue: "bg-sky-50 text-sky-600" }[tone];
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-500">{label}</span>
        <span className={cx("flex size-8 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-stone-500">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[a-z]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800", size === "sm" ? "size-7 text-[11px]" : "size-9 text-xs")}>
      {initials || "?"}
    </span>
  );
}

export const tableClass = {
  wrap: "overflow-x-auto",
  table: "w-full text-sm",
  head: "border-b border-stone-100 text-left text-xs font-medium text-stone-500",
  th: "px-5 py-2.5 font-medium",
  body: "divide-y divide-stone-100",
  td: "px-5 py-3",
};
