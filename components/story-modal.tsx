"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { ModalShell } from "@/components/ui/modal";
import { FadeImg } from "@/components/ui/fade-media";
import { thumbUrl } from "@/lib/drive/thumb";
import type { IgPreview } from "@/lib/instagram/client";

// Modal pratinjau story: hanya media + tanggal, tanpa judul.
// Dipakai semua tombol yg mengarah ke detail story (dropdown Detail,
// kartu board, kalender, tabel top content, tim).
export function StoryModal({
  open,
  onClose,
  date,
  igMediaId,
  preview,
  driveFileId,
}: {
  open: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  igMediaId?: string | null;
  preview?: IgPreview | null;
  driveFileId?: string | null;
}) {
  // Preview yg belum ada (mis. dari kalender/tim) diambil saat dibuka.
  const [fetched, setFetched] = useState<IgPreview | null>(null);
  useEffect(() => {
    if (!open || !igMediaId || preview) return;
    let alive = true;
    fetch(`/api/instagram/insights?preview=1&ids=${igMediaId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const p = (j as { previews?: Record<string, IgPreview> }).previews?.[igMediaId] ?? null;
        setFetched(p);
      })
      .catch(() => {
        if (alive) setFetched(null);
      });
    return () => {
      alive = false;
    };
  }, [open, igMediaId, preview]);

  const pv = preview ?? fetched;
  const src = pv?.mediaUrl || pv?.thumbUrl || (driveFileId ? thumbUrl(driveFileId) : null);
  const isVideo =
    pv?.mediaType === "VIDEO" ||
    pv?.mediaType === "REELS" ||
    (src ? /\.(mp4|mov|webm)(\?|$)/i.test(src) : false);
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    setVideoReady(false);
  }, [src]);

  return (
    <ModalShell open={open} label="Detail story" title="Detail story" onClose={onClose} size="sm">
      <div className="mx-auto w-full max-w-[280px]">
        {src ? (
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
            {isVideo ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={pv?.mediaUrl || src}
                poster={pv?.thumbUrl}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                onLoadedData={(e) => {
                  e.currentTarget.classList.remove("opacity-0");
                  setVideoReady(true);
                }}
                className={
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-500" +
                  (videoReady ? " opacity-100" : " opacity-0")
                }
              />
            ) : (
              <FadeImg
                src={src}
                className="absolute inset-0 h-full w-full"
                fallback={<Smartphone className="h-8 w-8 text-zinc-400" />}
              />
            )}
          </div>
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
            <Smartphone className="h-8 w-8 text-zinc-400" />
          </div>
        )}
        <p className="mt-3 text-center text-xs text-zinc-500">{fmtLong(date)}</p>
      </div>
    </ModalShell>
  );
}

function fmtLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso || "—";
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
