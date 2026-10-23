"use client";

import { useActionState, useState } from "react";
import { DEFAULT_MODELS, type AiProviderName } from "@/ai/provider";
import { Button, Field, FormMessage, inputClass } from "@/components/ui";
import { saveApiKey } from "./actions";

export function CredentialForm({ current }: { current: { provider: AiProviderName; model: string } | null }) {
  const [state, action, pending] = useActionState(saveApiKey, null);
  const [provider, setProvider] = useState<AiProviderName>(current?.provider ?? "anthropic");

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Provider">
          <select name="provider" value={provider} onChange={(e) => setProvider(e.target.value as AiProviderName)} className={inputClass}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
          </select>
        </Field>
        <Field label="Model" hint={`Leave blank for ${DEFAULT_MODELS[provider]}`}>
          <input
            name="model"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            defaultValue={current?.provider === provider ? current.model : ""}
            key={provider}
            placeholder={DEFAULT_MODELS[provider]}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label={current ? "New API key" : "API key"} hint="Checked with the provider, then stored encrypted. It's never shown again or sent back to the browser.">
        <input name="apiKey" type="password" autoComplete="new-password" data-1p-ignore data-lpignore="true" required placeholder={provider === "anthropic" ? "sk-ant-…" : "sk-…"} className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Checking with provider…" : current ? "Replace key" : "Save key"}
      </Button>
    </form>
  );
}
