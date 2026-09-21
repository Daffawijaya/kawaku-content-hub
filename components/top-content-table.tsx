"use client";

import Link from "next/link";
import { Fragment, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Clapperboard,
  Eye,
  Heart,
  Images,
  LayoutGrid,
  Smartphone,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { TypeBadge } from "@/components/ui/badge";
import {
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import type { IgInsights, IgPreview } from "@/lib/instagram/client";
import { posterUrl } from "@/lib/drive/thumb";
import type { ContentThumb } from "@/lib/content-db";
import { StoryModal } from "@/components/story-modal";

export type TopSortKey = "reach" | "engagement" | "views" | "newest";
export type TopContentItem = { c: ManagedContent; m?: IgInsights };

// Radius thumbnail baris tabel — satu pintu: ubah di sini, berlaku di
// semua tabel (termasuk renderRow kustom /content via BoardMedia).
export const TABLE_THUMB_ROUNDED = "rounded-sm";

const sortOptions: { key: TopSortKey; label: string }[] = [
  { key: "reach", label: "Reach" },
  { key: "engagement", label: "Engagement" },
  { key: "views", label: "Views" },
  { key: "newest", label: "Terbaru" },
];

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
  story: Smartphone,
};

// Ikon metrik sesuai sort yg dipilih (views = mata, dst).
const sortIcons: Record<Exclude<TopSortKey, "newest">, typeof Eye> = {
  reach: Users,
  views: Eye,
  engagement: Heart,
};

// Template grid kolom baris analytics — dipakai semua baris (data +
// skeleton) supaya tiap kolom sejajar, ala tabel /content.
// Urutan sel: konten, metrik (ikon + angka, lebar fix 90px biar angka
// rata kiri sejajar antar baris seperti kolom tipe), tipe, rincian. Sel metrik
// selalu dirender (kosong saat sort "Terbaru") dan sel rincian ada
// placeholder saat non-expandable agar kolom tidak geser.
// Tipe hidden di layar kecil.
const rowGrid =
  "grid grid-cols-[minmax(0,1fr)_90px_auto] items-center gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_90px_100px_28px]";

const skeleton = "animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800";

function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

function fmtDateLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function TopContentTable({
  items,
  loading,
  insightsLoading,
  previews,
  thumbs,
  sort,
  onSortChange,
  title = "Konten Teratas",
  action,
  expandable = true,
  sortable = true,
  emptyText = "Tidak ada konten published pada rentang & filter ini.",
  error = null,
  renderRow,
}: {
  items: TopContentItem[];
  loading: boolean;
  insightsLoading: boolean;
  previews: Record<string, IgPreview>;
  // Relasi konten → file Drive utk fallback poster saat belum ada visual IG
  // (mis. Konten Mendatang yg belum tertaut postingan).
  thumbs?: Record<string, ContentThumb>;
  sort: TopSortKey;
  onSortChange?: (s: TopSortKey) => void;
  title?: string;
  // Pengganti dropdown sort di kanan header (mis. link "View all").
  action?: ReactNode;
  // false = baris tanpa tombol rincian (mis. Recent di dashboard).
  expandable?: boolean;
  // false = dropdown sort kanan header disembunyikan (mis. tabel /content).
  sortable?: boolean;
  // Teks/blok kosong kustom (mis. "Belum ada konten terjadwal.").
  emptyText?: ReactNode;
  // Blok error kustom — bila diisi, menggantikan isi tabel.
  error?: ReactNode;
  // Render baris kustom per item (mis. tabel /content) — shell
  // (panel, header, skeleton, empty) tetap dipakai.
  renderRow?: (item: TopContentItem) => ReactNode;
}) {
  // Baris yg dibuka (satu per satu) utk rincian metrik.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Story dibuka sebagai modal pratinjau, bukan halaman detail.
  const [storyItem, setStoryItem] = useState<TopContentItem | null>(null);

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 bg-zinc-100/80 px-4 py-2.5 dark:bg-[#212121]">
        {title ? <h3 className="text-base font-semibold">{title}</h3> : <span />}
          {/* Sort: dropdown satu tombol — gaya sama dgn tombol analitik lengkap.
              Bisa diganti action kustom (mis. link "View all"). */}
          {action ?? (sortable ? (
          <Dropdown
            trigger={(open) => (
              <button
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-b from-white/30 to-white/0 bg-zinc-900/[0.05] px-3 text-xs font-medium text-zinc-900 backdrop-blur-md hover:bg-zinc-900/10 dark:from-white/[0.07] dark:to-white/0 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                {sortOptions.find((o) => o.key === sort)?.label}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
              </button>
            )}
          >
            {sortOptions.map((o) => (
              <DropdownItem
                key={o.key}
                selected={sort === o.key}
                onClick={() => onSortChange?.(o.key)}
              >
                {o.label}
              </DropdownItem>
            ))}
          </Dropdown>
          ) : null)}
      </div>
      <div>
        {error ? (
          error
        ) : loading ? (
          <div className="flex flex-col" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn(rowGrid, "py-2.5")}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn(skeleton, "h-10 w-10 shrink-0")} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className={cn(skeleton, "h-3.5 w-2/3")} />
                    <div className={cn(skeleton, "h-3 w-1/3")} />
                  </div>
                </div>
                {sort !== "newest" ? (
                  <div className={cn(skeleton, "h-3.5 w-12 justify-self-start")} />
                ) : (
                  <span />
                )}
                <div className={cn(skeleton, "hidden h-3.5 sm:block")} />
                <div className="flex justify-end">
                  <div className={cn(skeleton, "h-6 w-6 shrink-0 rounded-full")} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          typeof emptyText === "string" ? (
            <p className="px-5 py-6 text-sm text-zinc-500">{emptyText}</p>
          ) : (
            emptyText
          )
        ) : (
          <div className="flex flex-col">
            {items.map((item) => {
              if (renderRow) return <Fragment key={item.c.id}>{renderRow(item)}</Fragment>;
              const { c, m } = item;
              const Icon = typeIcons[c.type];
              const ti = (m as Partial<IgInsights> | undefined)?.total_interactions;
              const eng = m ? (ti || m.likes + m.comments + m.shares + m.saves) : null;
              const extra = (m ?? {}) as Partial<IgInsights>;
              const open = expandedId === c.id;
              // Sudah post → gambar dari IG; belum tertaut → ikon.
              const pv = c.igMediaId ? previews[c.igMediaId] : undefined;
              // Insights masih jalan → shimmer (teks & gambar), bukan "—".
              const pending = insightsLoading && !!c.igMediaId && !m;
              const thumbPending = insightsLoading && !!c.igMediaId && !pv;
              // Thumbnail IG di bawah; video/foto di atasnya — URL video IG
              // cepat kedaluwarsa (media_url bisa hilang duluan), pas mati
              // yang tampil thumbnail, bukan kosong.
              const visual = (pv?.mediaUrl || pv?.thumbUrl)
                ? {
                    url: pv?.mediaUrl ?? "",
                    thumbUrl: pv?.thumbUrl,
                    kind: pv?.mediaType === "VIDEO" || pv?.mediaType === "REELS" ? "video" : "image",
                  }
                : null;
              // media_url kosong/expired → tampil thumbnail sbg gambar biasa.
              // Tanpa visual IG (mis. scheduled) → poster kecil Drive.
              const visualIsVideo = visual?.kind === "video" && !!visual.url;
              const driveId = !visual ? thumbs?.[c.id]?.driveFileId : undefined;
              // Story: semua tautan detail diganti tombol modal pratinjau.
              const isStory = c.type === "story";
              const openStory = () => setStoryItem(item);
              const erPct = eng !== null && m && m.reach > 0 ? ((eng / m.reach) * 100).toFixed(1) : null;
              const details: { label: string; value: string }[] = m
                ? [
                    { label: "Reach", value: fmtNum(m.reach) },
                    { label: "Views", value: fmtNum(m.views) },
                    { label: "Engagement Rate", value: erPct ? `${erPct}%` : "0%" },
                    { label: "Likes", value: fmtNum(m.likes) },
                    { label: "Comments", value: fmtNum(m.comments) },
                    { label: "Shares", value: fmtNum(m.shares) },
                    { label: "Saves", value: fmtNum(m.saves) },
                    { label: "Reposts", value: extra.reposts ? fmtNum(extra.reposts) : "" },
                    { label: "Follows", value: extra.follows ? fmtNum(extra.follows) : "" },
                    { label: "Profile visits", value: extra.profile_visits ? fmtNum(extra.profile_visits) : "" },
                    { label: "Total interactions", value: fmtNum(ti || m.likes + m.comments + m.shares + m.saves) },
                  ]
                : [];
              // Kolom kanan: satu angka sesuai sort yg dipilih — sisanya lihat rincian.
              const sortValue = m
                ? sort === "reach"
                  ? fmtNum(m.reach)
                  : sort === "views"
                    ? fmtNum(m.views)
                    : sort === "engagement"
                      ? fmtNum(eng ?? 0)
                      : null
                : null;
              const MetricIcon = sort !== "newest" ? sortIcons[sort] : null;
              return (
                <Fragment key={c.id}>
                  {/* Baris compact ala /content: grid tanpa divider */}
                  <div className={cn(rowGrid, "py-2.5 hover:bg-white/70 dark:hover:bg-zinc-800/60")}>
                    <div className="flex min-w-0 items-center gap-3">
                    {isStory ? (
                      <button
                        type="button"
                        onClick={openStory}
                        aria-label="Lihat story"
                        className={cn("relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden bg-gradient-to-br", TABLE_THUMB_ROUNDED, c.tone, thumbPending && "animate-pulse")}
                      >
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-zinc-500" />
                        </span>
                        {visual ? (
                          visualIsVideo ? (
                            <>
                              {visual.thumbUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={visual.thumbUrl}
                                  alt=""
                                  loading="lazy"
                                  className="absolute inset-0 h-full w-full object-cover"
                                />
                              )}
                            </>
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
                          />
                        ) : null}
                      </button>
                    ) : (
                    <Link
                      href={`/content/${c.id}`}
                      className={cn("relative h-10 w-10 shrink-0 overflow-hidden bg-gradient-to-br", TABLE_THUMB_ROUNDED, c.tone, thumbPending && "animate-pulse")}
                    >
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-zinc-500" />
                      </span>
                      {visual ? (
                        visualIsVideo ? (
                          <>
                            {visual.thumbUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={visual.thumbUrl}
                                alt=""
                                loading="lazy"
                                onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500"
                              />
                            )}
                            <video
                              src={visual.url}
                              poster={visual.thumbUrl}
                              preload="metadata"
                              muted
                              playsInline
                              className="absolute inset-0 h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={visual.url || visual.thumbUrl}
                            alt=""
                            loading="lazy"
                            onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
                            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )
                      ) : driveId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={posterUrl(driveId)}
                          alt=""
                          loading="lazy"
                          onLoad={(e) => e.currentTarget.classList.remove("opacity-0")}
                          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                    </Link>
                    )}
                    <div className="min-w-0 flex-1">
                      {isStory ? (
                        <button type="button" onClick={openStory} className="line-clamp-1 block w-full truncate text-left text-sm font-medium">
                          {c.title}
                        </button>
                      ) : (
                        <Link href={`/content/${c.id}`} className="line-clamp-1 text-sm font-medium">
                          {c.title}
                        </Link>
                      )}
                      <p className="mt-1 text-xs text-zinc-500">{fmtDateLong(c.scheduledDate)}</p>
                    </div>
                    </div>
                    <span className="flex min-w-0 items-center justify-start gap-1.5 text-left text-sm font-medium tabular-nums">
                      {sort !== "newest" && MetricIcon && (
                        <MetricIcon className="h-3.5 w-3.5 shrink-0 text-white" />
                      )}
                      {sort !== "newest" &&
                        (pending ? (
                          <span className={cn(skeleton, "block h-3.5 w-10")} />
                        ) : (
                          (sortValue ?? "0")
                        ))}
                    </span>
                    <span className="hidden min-w-0 sm:block">
                      <TypeBadge type={c.type} />
                    </span>
                    {expandable ? (
                    <button
                      onClick={() => setExpandedId(open ? null : c.id)}
                      aria-expanded={open}
                      aria-label={open ? "Tutup rincian" : "Lihat rincian"}
                      className="inline-flex h-fit shrink-0 justify-self-end rounded-full p-1 text-zinc-400 backdrop-blur-md hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-700/70 dark:hover:text-zinc-200"
                    >
                      <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                    </button>
                    ) : isStory ? (
                      <button
                        type="button"
                        onClick={openStory}
                        aria-label="Lihat story"
                        className="inline-flex h-fit shrink-0 cursor-pointer justify-self-end rounded-full p-1 text-zinc-400 backdrop-blur-md hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-700/70 dark:hover:text-zinc-200"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : (
                      <Link
                        href={`/content/${c.id}`}
                        aria-label="Lihat detail"
                        className="inline-flex h-fit shrink-0 justify-self-end rounded-full p-1 text-zinc-400 backdrop-blur-md hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-700/70 dark:hover:text-zinc-200"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                  {/* Rincian selalu dirender; buka-tutup via animasi grid-rows */}
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 py-3">
                        {pending ? (
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4" aria-hidden="true">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <div key={i} className={cn(skeleton, "h-4")} />
                            ))}
                          </div>
                        ) : m ? (
                          <>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                              {details.map((d) => (
                                <p key={d.label} className="flex items-baseline justify-between gap-2 text-sm">
                                  <span className="text-zinc-500">{d.label}</span>
                                  <span className="font-medium">{d.value}</span>
                                </p>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                              {isStory ? (
                                <button type="button" onClick={openStory} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                                  Buka detail konten
                                </button>
                              ) : (
                                <Link href={`/content/${c.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                                  Buka detail konten
                                </Link>
                              )}
                              {c.publishedUrl && (
                                <a href={c.publishedUrl} target="_blank" rel="noreferrer" className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                                  Lihat di Instagram
                                </a>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-zinc-500">
                            Belum ada metrik IG untuk konten ini (belum tertaut atau insights kedaluwarsa).
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
      <StoryModal
        open={storyItem !== null}
        onClose={() => setStoryItem(null)}
        date={storyItem?.c.scheduledDate ?? ""}
        igMediaId={storyItem?.c.igMediaId}
        preview={storyItem?.c.igMediaId ? previews[storyItem.c.igMediaId] : undefined}
        driveFileId={storyItem ? thumbs?.[storyItem.c.id]?.driveFileId : undefined}
      />
    </section>
  );
}
