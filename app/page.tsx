"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

// BG ungu dari /public (nama file berisi spasi → di-encode).
const BG = "/ChatGPT%20Image%20Sep%2020,%202026,%2004_42_08%20PM.png";
const CMD = "npx antislop-ai";
const DROP_NAV = ["Rules", "Skills", "Agents", "Docs"];

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  async function copyCmd() {
    try {
      await navigator.clipboard.writeText(CMD);
    } catch {
      /* abaikan: tetap tampilkan centang */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#14101f] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BG} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1650px] flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <p className="text-xl font-bold tracking-tight">/antislop</p>
          <nav className="hidden items-center gap-12 lg:flex">
            {DROP_NAV.map((item) => (
              <button
                key={item}
                type="button"
                className="inline-flex items-center gap-1.5 text-[17px] font-medium text-white/90 hover:text-white"
              >
                {item}
                <ChevronDown className="h-4 w-4" />
              </button>
            ))}
            <button type="button" className="text-[17px] font-medium text-white/90 hover:text-white">
              Roadmap
            </button>
          </nav>
          <div className="flex items-center gap-8">
            <button type="button" className="text-[17px] font-medium text-white/90 hover:text-white">
              GitHub
            </button>
            <button
              type="button"
              className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-[17px] font-medium backdrop-blur-md hover:bg-white/20"
            >
              Install antislop
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <h1 className="text-[clamp(2.75rem,6vw,4.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Rules for AI coding agents
          </h1>
          <p className="mt-6 max-w-3xl text-[clamp(1rem,1.6vw,1.5rem)] leading-snug text-white/90">
            A filter for coding agents across UI, copy, and code. 38 mandatory rules, a liveliness
            toolkit, and zero generic slop.
          </p>
          <div className="mt-10 flex w-full max-w-[470px] items-center justify-between gap-4 rounded-full border border-white/25 bg-white/10 py-2.5 pl-7 pr-2.5 backdrop-blur-md">
            <code className="font-mono text-base text-white/95">{CMD}</code>
            <button
              type="button"
              onClick={copyCmd}
              aria-label="Salin perintah"
              className="shrink-0 rounded-full border border-white/30 p-3 text-white/90 hover:bg-white/10"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </main>

        <footer className="pb-8 text-center text-[15px] text-white/70">
          antislop is a filter, not magic. It clears the slop from your UI, text, and code. A
          beautiful UI is DESIGN.md&rsquo;s job, and yours.
        </footer>
      </div>
    </div>
  );
}
