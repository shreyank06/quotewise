"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Button, Card, FormMessage } from "@/components/ui";
import { createDraft } from "./actions";

const PROGRESS = ["Reading the enquiry…", "Working out the job and sizes…", "Matching items on your price list…", "Checking your quoting rules…"];

function Progress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS.length - 1)), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="flex items-center gap-2 text-sm text-stone-500" aria-live="polite">
      <Loader2 className="size-4 animate-spin text-brand-600" />
      {PROGRESS[step]}
    </span>
  );
}

export function NewQuoteForm() {
  const [state, action, pending] = useActionState(createDraft, null);
  // Controlled so the pasted text survives a failed attempt (React resets uncontrolled forms after an action).
  const [text, setText] = useState("");
  const length = text.length;

  return (
    <Card>
      <form action={action}>
        <textarea
          name="enquiry"
          required
          rows={20}
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={pending}
          placeholder={"From: Jane Smith <jane@example.com>\nSubject: Patio quote\n\nHi, we'd like a quote for a new patio at the back, roughly 4m by 3m…"}
          className="block w-full resize-y rounded-t-xl border-0 bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed text-stone-800 outline-none placeholder:text-stone-400 read-only:opacity-60"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50/60 px-5 py-3">
          <div className="min-h-5">{pending ? <Progress /> : state ? <FormMessage state={state} /> : <span className="text-xs text-stone-400">{length > 0 ? `${length.toLocaleString()} characters` : "Usually takes 15–40 seconds"}</span>}</div>
          <Button type="submit" variant="brand" icon={pending ? undefined : Sparkles} disabled={pending || length < 20}>
            {pending ? "Drafting…" : "Draft quote"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
