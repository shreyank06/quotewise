import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getTenant } from "@/server/auth/session";
import { LoginForm } from "./login-form";

const POINTS = [
  { icon: Sparkles, title: "Drafts in under a minute", text: "Paste an enquiry and get line items picked from your own price list." },
  { icon: CheckCircle2, title: "Nothing goes out unchecked", text: "Every quote waits for someone in the office to review and approve it." },
  { icon: ShieldCheck, title: "Your data stays yours", text: "Each company's prices, customers and AI key are kept completely separate." },
];

export default async function LoginPage() {
  if (await getTenant()) redirect("/quotes");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-brand-700/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-brand-600/30 blur-3xl" />
        <Logo inverted className="relative" />
        <div className="relative max-w-md">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">Quotes written for you. Approved by you.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4.5 text-brand-100" />
                </span>
                <div>
                  <div className="font-medium">{title}</div>
                  <div className="mt-0.5 text-sm text-brand-100/80">{text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-100/60">Built for small UK contractors.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Sign in</h1>
          <p className="mt-1.5 mb-8 text-sm text-stone-500">Use the login your company was given.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
