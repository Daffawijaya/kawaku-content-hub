"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Smartphone } from "lucide-react";
import type { ManagedContent } from "@/lib/mock";
import type { IgPreview } from "@/lib/instagram/client";
import type { ContentThumb } from "@/lib/content-db";
import { posterUrl } from "@/lib/drive/thumb";
import { StoryModal } from "@/components/story-modal";

// Strip/korsel kartu vertikal 9:16 khusus story — pemisah visual dari
// tabel baris. Disembunyikan total bila kosong. Klik kartu = StoryModal.
export function StoryStrip({
  items,
  previews,
  thumbs,
  title = "Story",
}: {
  items: ManagedContent[];
  previews: Record<string, IgPreview>;
  thumbs?: Record<string, ContentThumb>;
  title?: string;
}) {
  const [active, setActive] = useState<ManagedContent | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;
  const activePv = active?.igMediaId ? previews[active.igMediaId] : undefined;
  function nudge(dir: 1 | -1) {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {title} <span className="ml-1 font-normal text-zinc-400">{items.length}</span>
        </h3>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            aria-label="Geser story ke kiri"
            onClick={() => nudge(-1)}
            className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Geser story ke kanan"
            onClick={() => nudge(1)}
            className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={trackRef} className="mt-3 flex gap-3 overflow-x-auto pb-2 [scroll-snap-type:x_mandatory]">
        {items.map((c) => {
          const pv = c.igMediaId ? previews[c.igMediaId] : undefined;
          const visual =
            pv?.mediaUrl || pv?.thumbUrl
              ? {
                  url: pv?.mediaUrl ?? "",
                  thumbUrl: pv?.thumbUrl,
                  video: pv?.mediaType === "VIDEO" || pv?.mediaType === "REELS",
                }
              : null;
          const driveId = !visual ? thumbs?.[c.id]?.driveFileId : undefined;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c)}
              aria-label={`Lihat story ${c.title}`}
              className="w-32 shrink-0 snap-start text-left sm:w-36"
            >
              <span className="relative block aspect-[9/16] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                {visual ? (
                  visual.video && visual.url ? (
                    <video
                      src={visual.url}
                      poster={visual.thumbUrl}
                      preload="metadata"
                      muted
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={visual.url || visual.thumbUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )
                ) : driveId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterUrl(driveId)}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-zinc-400" />
                  </span>
                )}
              </span>
              <span className="mt-1.5 block truncate text-xs font-medium">{c.title}</span>
              <span className="block text-[11px] text-zinc-500">{fmtShort(c.scheduledDate)}</span>
            </button>
          );
        })}
      </div>
      <StoryModal
        open={active !== null}
        onClose={() => setActive(null)}
        date={active?.scheduledDate ?? ""}
        igMediaId={active?.igMediaId}
        preview={activePv}
        driveFileId={active ? thumbs?.[active.id]?.driveFileId : undefined}
      />
    </section>
  );
}

function fmtShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso || "—";
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
