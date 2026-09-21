"use client";

import { useEffect, useState } from "react";

function nextSummit(): number {
  const now = new Date();
  let target = new Date(now.getFullYear(), 2, 25, 9, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target = new Date(now.getFullYear() + 1, 2, 25, 9, 0, 0);
  }
  return target.getTime();
}

function parts(target: number): [string, string, string, string] {
  const diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [pad(d), pad(h), pad(m), pad(s)];
}

const CELLS = ["Days", "Hours", "Minutes", "Seconds"] as const;

export function Countdown({ serif }: { serif: string }) {
  const [target] = useState(nextSummit);
  const [time, setTime] = useState<[string, string, string, string]>(() => parts(target));

  useEffect(() => {
    const id = setInterval(() => setTime(parts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const shown = time;

  return (
    <div className="flex items-start gap-3 sm:gap-4" role="timer" aria-label="Hitung mundur acara">
      {shown.map((v, i) => (
        <div key={CELLS[i]} className="flex items-start gap-3 sm:gap-4">
          <div>
            <p className="text-[12px] text-[#8a8a93]">{CELLS[i]}</p>
            <p
              suppressHydrationWarning
              className={`${serif} mt-1 text-[44px] font-black leading-none tabular-nums text-[#0b1533] sm:text-[56px]`}
            >
              {v}
            </p>
          </div>
          {i < shown.length - 1 && (
            <span
              aria-hidden="true"
              className={`${serif} mt-5 text-[32px] font-black leading-none text-[#0b1533] sm:mt-6 sm:text-[40px]`}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
