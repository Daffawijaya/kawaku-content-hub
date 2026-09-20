"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyHandle({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(handle);
    } catch {
      /* abaikan: tetap tampilkan centang */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mt-10 flex w-full max-w-[470px] items-center justify-between gap-4 rounded-full border border-white/25 bg-white/10 py-2.5 pl-7 pr-2.5 backdrop-blur-md">
      <code className="font-mono text-base text-white/95">{handle}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Salin handle Instagram"
        className="shrink-0 rounded-full border border-white/30 p-3 text-white/90 hover:bg-white/10"
      >
        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
      </button>
    </div>
  );
}
