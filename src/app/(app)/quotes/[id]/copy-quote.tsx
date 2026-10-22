"use client";

import { Check, CircleCheckBig, Copy } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

export function CopyQuote({ text, approvedLine }: { text: string; approvedLine: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="overflow-hidden border-brand-200">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-50/70 px-5 py-4">
        <div className="flex items-start gap-3">
          <CircleCheckBig className="mt-0.5 size-5 text-brand-600" />
          <div>
            <h2 className="font-semibold text-brand-900">Approved and ready to send</h2>
            <p className="text-sm text-brand-800/80">{approvedLine}. Copy it into your email to the customer.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="brand"
          icon={copied ? Check : Copy}
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied" : "Copy quote"}
        </Button>
      </div>
      <pre className="max-h-[28rem] overflow-auto px-5 py-4 font-sans text-[13.5px] leading-relaxed whitespace-pre-wrap text-stone-700">{text}</pre>
    </Card>
  );
}
