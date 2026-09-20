"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// BG ungu dari /public (nama file berisi spasi → di-encode).
const BG = "/ChatGPT%20Image%20Sep%2020,%202026,%2004_42_08%20PM.png";
const IG_HANDLE = "@kawaku.kukar";
const IG_URL = "https://instagram.com/kawaku.kukar";

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  async function copyHandle() {
    try {
      await navigator.clipboard.writeText(IG_HANDLE);
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
          <p className="text-xl font-bold tracking-tight">kawaku</p>
          <div className="flex items-center gap-3 sm:gap-6">
            <a
              href="/login"
              className="text-[15px] font-medium text-white/70 hover:text-white sm:text-[17px]"
            >
              Masuk
            </a>
            <a
              href={IG_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-[15px] font-medium backdrop-blur-md hover:bg-white/20 sm:text-[17px]"
            >
              Lihat Instagram
            </a>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <h1 className="max-w-5xl text-[clamp(2.75rem,6vw,4.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            Karya Wirausaha dan Ekonomi Kreatif Kutai Kartanegara
          </h1>
          <p className="mt-6 max-w-3xl text-[clamp(1rem,1.6vw,1.5rem)] leading-snug text-white/90">
            Edukasi, inspirasi, dan info seputar UMKM — 260+ konten dikelola tim dalam satu hub.
          </p>
          <div className="mt-10 flex w-full max-w-[470px] items-center justify-between gap-4 rounded-full border border-white/25 bg-white/10 py-2.5 pl-7 pr-2.5 backdrop-blur-md">
            <code className="font-mono text-base text-white/95">{IG_HANDLE}</code>
            <button
              type="button"
              onClick={copyHandle}
              aria-label="Salin handle Instagram"
              className="shrink-0 rounded-full border border-white/30 p-3 text-white/90 hover:bg-white/10"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </main>

        <p className="pb-8 text-center text-[15px] text-white/70">
          Promosi UMKM gratis lewat Etalase UMKM di Instagram kami.
        </p>
      </div>
    </div>
  );
}
