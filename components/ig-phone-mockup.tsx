"use client";

import { useEffect, useState } from "react";
import {
  BatteryMedium,
  Bell,
  ChevronDown,
  ChevronLeft,
  Layers,
  LayoutGrid,
  MoreHorizontal,
  Play,
  Repeat2,
  SignalHigh,
  SquarePlay,
  SquareUserRound,
  UserPlus,
  Wifi,
} from "lucide-react";
import type { ProfileFeed } from "@/app/api/instagram/profile-feed/route";
import { FadeImg } from "@/components/ui/fade-media";

const IG_URL = "https://instagram.com/kawaku.kukar";

// Ribuan ala Indonesia: 1914 → "1.914".
function fmt(n: number) {
  return n.toLocaleString("id-ID");
}

function Clock() {
  const [now, setNow] = useState("--.--");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(`${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);
  return <span className="text-xs font-semibold">{now}</span>;
}

export function IgPhoneMockup({ feed }: { feed: ProfileFeed }) {
  const tiles = feed.tiles.slice(0, 6);
  return (
    <div className="w-full max-w-[330px] rounded-[2.75rem] border border-white/20 bg-black p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
      <div className="overflow-hidden rounded-[2.1rem] bg-black text-white">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-3">
          <Clock />
          <div className="flex items-center gap-1.5">
            <SignalHigh className="h-3.5 w-3.5" />
            <Wifi className="h-3.5 w-3.5" />
            <span className="flex items-center gap-0.5 text-[11px] font-medium">
              67
              <BatteryMedium className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Header profil */}
        <div className="flex items-center justify-between px-3 pt-2">
          <div className="flex items-center gap-2">
            <ChevronLeft className="h-6 w-6" />
            <p className="text-[17px] font-bold tracking-tight">{feed.username}</p>
          </div>
          <div className="flex items-center gap-4">
            <Bell className="h-6 w-6" />
            <MoreHorizontal className="h-6 w-6" />
          </div>
        </div>

        {/* Identitas + statistik */}
        <div className="flex items-center gap-4 px-4 pt-3">
          <FadeImg
            src={feed.avatar}
            alt={feed.username}
            eager
            className="h-[76px] w-[76px] shrink-0 rounded-full ring-1 ring-white/20"
          />
          <div className="flex-1">
            <p className="text-[13px] font-semibold">{feed.name}</p>
            <div className="mt-1 flex gap-4">
              {[
                { v: feed.posts, l: "postingan" },
                { v: feed.followers, l: "pengikut" },
                { v: feed.following, l: "mengikuti" },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <p className="text-[15px] font-bold leading-tight">{fmt(s.v)}</p>
                  <p className="text-[11px] leading-tight text-white/90">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="whitespace-pre-line px-4 pt-2 text-[12px] leading-snug">{feed.biography}</p>

        {/* Tombol aksi */}
        <div className="flex gap-1.5 px-4 pt-3">
          <a
            href={IG_URL}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/15 py-1.5 text-[12px] font-semibold"
          >
            Mengikuti
            <ChevronDown className="h-3.5 w-3.5" />
          </a>
          <a
            href={IG_URL}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg bg-white/15 py-1.5 text-center text-[12px] font-semibold"
          >
            Kirim Pesan
          </a>
          <a
            href={IG_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Tambah teman"
            className="rounded-lg bg-white/15 px-2.5 py-1.5"
          >
            <UserPlus className="h-4 w-4" />
          </a>
        </div>

        {/* Tab bar */}
        <div className="mt-3 flex border-t border-white/10">
          {[
            { icon: LayoutGrid, active: true, label: "Grid" },
            { icon: SquarePlay, active: false, label: "Reels" },
            { icon: Repeat2, active: false, label: "Repost" },
            { icon: SquareUserRound, active: false, label: "Ditandai" },
          ].map((t) => (
            <div
              key={t.label}
              aria-label={t.label}
              className={`flex flex-1 justify-center border-t-2 py-2 ${t.active ? "border-white" : "border-transparent"}`}
            >
              <t.icon className={`h-6 w-6 ${t.active ? "text-white" : "text-white/40"}`} />
            </div>
          ))}
        </div>

        {/* Grid 3x2 */}
        <div className="grid grid-cols-3 gap-[2px] pb-1">
          {tiles.map((t) => (
            <a key={t.link || t.src} href={t.link || IG_URL} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden bg-white/5">
              <FadeImg
                src={t.src}
                className="h-full w-full bg-white/5 dark:bg-white/5"
                imgClassName="object-cover"
              />
              {(t.type === "CAROUSEL_ALBUM" || t.type === "VIDEO" || t.type === "REELS") && (
                <span className="absolute right-1.5 top-1.5 z-10 text-white drop-shadow">
                  {t.type === "CAROUSEL_ALBUM" ? <Layers className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                </span>
              )}
            </a>
          ))}
          {Array.from({ length: Math.max(0, 6 - tiles.length) }).map((_, i) => (
            <div key={`ph-${i}`} className="aspect-square bg-gradient-to-br from-violet-900/60 to-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
