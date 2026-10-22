"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import { Button, Field, FormMessage, inputClass } from "@/components/ui";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="space-y-5">
      <Field label="Email">
        <input name="email" type="email" autoComplete="email" required placeholder="you@company.co.uk" className={`${inputClass} h-10`} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required className={`${inputClass} h-10`} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" variant="brand" size="lg" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
