"use client";

import { LuInstagram } from "react-icons/lu";

export function InstagramCommand() {
  const command = "https://instagram.com/kawaku.kukar";

  return (
    <div className="mx-auto mt-8 flex w-full max-w-lg items-center justify-between rounded-full border border-white/25 bg-white/5 py-1.5 pl-4 pr-1.5 backdrop-blur-md">
      <a
        href={command}
        target="_blank"
        rel="noreferrer"
        className="ml-2 text-[15px] font-medium text-white/90 hover:text-white"
      >
        Kunjungi instagram kawaku
      </a>
      <a
        href={command}
        target="_blank"
        rel="noreferrer"
        className="ml-4 rounded-full border border-white/25 bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white"
        aria-label="Kunjungi Instagram"
      >
        <LuInstagram className="h-5 w-5" />
      </a>
    </div>
  );
}
