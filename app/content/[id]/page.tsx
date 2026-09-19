"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  Eye,
  HardDrive,
  Heart,
  Image as ImageIcon,
  Images,
  Camera,
  LayoutGrid,
  MessageCircle,
  Pencil,
  Send,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { pillGlass, pillWhite } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  statusMeta,
  statusTransitions,
  transitionLabels,
  type ContentType,
} from "@/lib/mock";
import {
  addComment,
  changeStatus,
  deleteContent,
  getContent,
  type ContentDetail,
} from "@/lib/content-db";
import { thumbUrl } from "@/lib/drive/thumb";
import { consumeMediaWarning, consumeSaved } from "@/lib/ui-flags";
import type { IgInsights, IgPreview } from "@/lib/instagram/client";

type RelatedAsset = {
  id: string;
  name: string;
  kind: "image" | "video";
  size_label: string;
  duration: string | null;
  tone: string;
  drive_file_id: string;
};

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
};

// Section flat ala analytics/settings: divider rambut, tanpa Card.
const section = "mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-800";
const input =
  "w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-[#4c4c4c] dark:text-zinc-100";
const dangerPill =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50";

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ContentDetail | null | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [igBusy, setIgBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [candidates, setCandidates] = useState<
    { id: string; caption: string; media_type: string | null; permalink: string | null; timestamp: string | null }[]
  >([]);
  // Relasi media dari database.
  const [relatedDb, setRelatedDb] = useState<RelatedAsset[] | null>(null);
  // Preview + metrik IG utk hero & statistik (hanya yg tertaut).
  const [igPreview, setIgPreview] = useState<IgPreview | null>(null);
  const [igMetrics, setIgMetrics] = useState<IgInsights | null>(null);


  async function refresh() {
    try {
      const d = (await getContent(id)) ?? null;
      setDetail(d);
      if (d?.igMediaId) {
        const igId = d.igMediaId;
        fetch(`/api/instagram/insights?ids=${igId}`)
          .then((r) => r.json())
          .then((j) => {
            const data = j as { metrics?: Record<string, IgInsights>; previews?: Record<string, IgPreview> };
            setIgPreview(data.previews?.[igId] ?? null);
            setIgMetrics(data.metrics?.[igId] ?? null);
          })
          .catch(() => {
            setIgPreview(null);
            setIgMetrics(null);
          });
      } else {
        setIgPreview(null);
        setIgMetrics(null);
      }
      const res = await fetch(`/api/content/${id}/media`);
      if (res.ok) {
        const json = (await res.json()) as { assets: RelatedAsset[] };
        setRelatedDb(json.assets ?? []);
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Gagal memuat detail.");
      setDetail(null);
    }
  }

  useEffect(() => {
    void refresh();
    if (consumeSaved() === id) setJustSaved(true);
    const mediaWarn = consumeMediaWarning();
    if (mediaWarn) setActionError(mediaWarn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (detail === undefined) {
    return <p className="py-12 text-center text-sm text-zinc-500">Memuat detail konten…</p>;
  }

  if (detail === null) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-base font-semibold">Konten tidak ditemukan</p>
        <p className="mt-1 text-sm text-zinc-500">ID “{id}” tidak ditemukan.</p>
        <Link href="/content" className={pillGlass}>
          Kembali ke Konten
        </Link>
      </div>
    );
  }

  const transitions = detail ? (statusTransitions[detail.status] ?? []) : [];
  const related: RelatedAsset[] = relatedDb ?? [];
  const isRealDriveId = (v: string) => !!v && !v.startsWith("drive_mock_");
  const driveAssets = related
    .filter((m) => isRealDriveId(m.drive_file_id))
    .map((m) => ({ id: m.id, name: m.name, driveFileId: m.drive_file_id }));
  // Hero: gambar aset pertama (kalau ada file Drive asli).
  const heroDriveId = driveAssets[0]?.driveFileId ?? null;
  // Published ber-link IG: hero dari IG dulu (kebal hapus Drive).
  const heroIgUrl = igPreview?.mediaUrl || igPreview?.thumbUrl;
  const heroIgIsVideo =
    (igPreview?.mediaType === "VIDEO" || igPreview?.mediaType === "REELS") && !!igPreview?.mediaUrl;
  const Icon = typeIcons[detail.type];

  async function applyStatus(to: (typeof transitions)[number]) {
    setActionError(null);
    try {
      await changeStatus(detail!.id, to);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Gagal mengubah status.");
    }
  }

  async function removeContent() {
    setActionError(null);
    try {
      await deleteContent(id);
      router.push("/content");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Hapus gagal.");
      setConfirmDelete(false);
    }
  }

  async function publishToIg() {
    setActionError(null);
    setIgBusy(true);
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: detail!.id }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? `Posting gagal (HTTP ${res.status}).`);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Posting ke IG gagal.");
    } finally {
      setIgBusy(false);
    }
  }

  async function postComment() {
    if (!comment.trim()) return;
    setActionError(null);
    try {
      await addComment(detail!.id, comment.trim());
      setComment("");
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Gagal mengirim komentar.");
    }
  }

  async function loadCandidates() {
    setActionError(null);
    setLinking(true);
    try {
      const res = await fetch("/api/instagram/link");
      const json = (await res.json().catch(() => null)) as {
        items?: { id: string; caption: string; media_type: string | null; permalink: string | null; timestamp: string | null }[];
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error ?? `Gagal membaca IG (HTTP ${res.status}).`);
      setCandidates(json?.items ?? []);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Gagal membaca IG.");
      setLinking(false);
    }
  }

  async function linkTo(igId: string) {
    setActionError(null);
    setIgBusy(true);
    try {
      const res = await fetch("/api/instagram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: detail!.id, igMediaId: igId }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? `Gagal menghubungkan (HTTP ${res.status}).`);
      setLinking(false);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Gagal menghubungkan.");
    } finally {
      setIgBusy(false);
    }
  }

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href="/content"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Konten
        </Link>
        <span className="flex gap-2">
          {confirmDelete ? (
            <>
              <button type="button" className={pillGlass} onClick={() => setConfirmDelete(false)}>
                Batal
              </button>
              <button
                type="button"
                onClick={removeContent}
                className={dangerPill}
                title={detail.igMediaId ? "Postingan IG dihapus dulu, lalu data lokal + file Drive" : "Data lokal + file Drive dihapus"}
              >
                <Trash2 className="h-4 w-4" /> Ya, hapus{detail.igMediaId ? " total" : ""}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={pillGlass} onClick={() => setConfirmDelete(true)} title="Hapus (admin)">
                <Trash2 className="h-4 w-4" /> Hapus
              </button>
              <Link href={`/content/${detail.id}/edit`} className={pillWhite}>
                <Pencil className="h-4 w-4" /> Ubah
              </Link>
            </>
          )}
        </span>
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {actionError}
        </p>
      )}

      {justSaved && (
        <p className="mb-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Perubahan tersimpan.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <TypeBadge type={detail.type} />
        <StatusBadge status={detail.status} />
        {detail.publishedUrl && (
          <a
            href={detail.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            <ExternalLink className="h-3 w-3" /> Lihat postingan
          </a>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main */}
        <div className="min-w-0 space-y-6 lg:shrink-0">
          {heroIgUrl || heroDriveId ? (
            <div className="relative lg:w-fit">
              <div className="relative z-10 overflow-hidden rounded-lg">
              {heroIgUrl ? (
                heroIgIsVideo ? (
                  <video
                    src={igPreview?.mediaUrl}
                    poster={igPreview?.thumbUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="h-auto w-full bg-black lg:h-[520px] lg:w-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroIgUrl}
                    alt={detail.title}
                    loading="lazy"
                    className="h-auto w-full max-w-full lg:h-[520px] lg:w-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbUrl(heroDriveId!)}
                  alt={detail.title}
                  loading="lazy"
                  className="h-auto w-full max-w-full lg:h-[520px] lg:w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              </div>
            </div>
          ) : (
            <div className={cn("relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br lg:aspect-[4/5] lg:h-[520px] lg:w-auto", detail.tone)}>
              <Icon className="h-10 w-10 text-zinc-400" />
            </div>
          )}
          {(related.length > 0 || detail.status !== "published") && (
          <section className={section}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Media terkait ({related.length})</h3>
              <Link href="/media" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
                Buka pustaka
              </Link>
            </div>
            {related.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Belum ada media terhubung.</p>
            ) : (
              <ul className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
                {related.map((m) => (
                    <li key={m.id}>
                      <Link
                        href="/media"
                        className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-zinc-900/5 dark:hover:bg-white/10"
                      >
                        <span className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br", m.tone || "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900")}>
                          {m.kind === "video" ? (
                            <Clapperboard className="h-4 w-4 text-zinc-500" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-zinc-500" />
                          )}
                          {m.drive_file_id && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbUrl(m.drive_file_id)}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{m.name}</span>
                          <span className="block text-xs text-zinc-500">
                            {m.size_label}{m.duration ? ` • ${m.duration}` : ""}{m.drive_file_id ? " • Drive" : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
          </section>
          )}
        </div>

        {/* Side */}
        <div className="flex min-w-0 flex-1 flex-col lg:sticky lg:top-20 lg:max-h-[520px]">
          <div className="shrink-0 space-y-2">
            <p className="whitespace-pre-line text-sm">{detail.caption || "—"}</p>
            {detail.hashtags && (
              <p className="text-sm text-sky-600 dark:text-sky-400">{detail.hashtags}</p>
            )}
            <p className="text-xs text-zinc-500">
              {detail.scheduledDate ? `${fmtDate(detail.scheduledDate)} • ${detail.scheduledTime} WITA` : "Belum dijadwalkan"} • {detail.pic}
            </p>
            {detail.notes && (
              <p className="text-xs text-zinc-500">
                <span className="font-medium">Catatan internal: </span>{detail.notes}
              </p>
            )}
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto lg:pr-1">
            {detail.comments.length === 0 ? (
              <p className="text-xs text-zinc-500">Belum ada komentar.</p>
            ) : (
              <ul className="space-y-3">
                {detail.comments.map((c) => (
                  <li key={c.id} className="flex gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {initials(c.author)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-semibold">{c.author}</span>
                        <span className="ml-2 text-zinc-400">{fmtDate(c.at)}</span>
                      </p>
                      <p className="mt-0.5 text-sm">{c.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

          {transitions.length > 0 && (
          <section className={section}>
            <h3 className="text-sm font-semibold">Status</h3>
            <div className="mt-3 space-y-2.5">
              {transitions.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  className={cn(i === 0 ? pillWhite : pillGlass, "w-full")}
                  onClick={() => applyStatus(t)}
                >
                  {transitionLabels[`${detail.status}->${t}`] ?? statusMeta[t].label}
                </button>
              ))}
            </div>
          </section>
          )}

          {(driveAssets.length > 0 || detail.status !== "published") && (
          <section className={section}>
            <h3 className="text-sm font-semibold">Drive</h3>
            <div className="mt-3 space-y-1">
              {driveAssets.length === 0 ? (
                <p className="text-xs text-zinc-500">Belum ada file di Google Drive.</p>
              ) : (
                driveAssets.map((a) => (
                  <a
                    key={a.id}
                    href={`https://drive.google.com/file/d/${a.driveFileId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-zinc-900/5 dark:hover:bg-white/10"
                  >
                    <HardDrive className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                  </a>
                ))
              )}
            </div>
          </section>
          )}

          {(!detail.publishedUrl || detail.igSyncError) && (
          <section className={section}>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Camera className="h-4 w-4" /> Instagram
            </h3>
              <div className="mt-3 space-y-2">
                {detail.igSyncError && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    {detail.igSyncError}
                  </p>
                )}
                {!detail.publishedUrl && (
                  <>
                    <button type="button" className={cn(pillWhite, "w-full")} onClick={publishToIg} disabled={igBusy}>
                      <Send className="h-4 w-4" /> {igBusy ? "Memposting…" : "Posting ke IG"}
                    </button>
                    <p className="text-[11px] text-zinc-400">Media Drive dijadikan publik otomatis saat posting.</p>
                    {!linking ? (
                      <button
                        onClick={loadCandidates}
                        className="text-[11px] font-medium text-brand-700 hover:underline dark:text-brand-400"
                      >
                        atau hubungkan ke postingan yg sudah ada
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-zinc-500">
                          {candidates.length === 0 ? "Memuat postingan…" : "Pilih postingan:"}
                        </p>
                        <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                          {candidates.map((m) => (
                            <li key={m.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs hover:bg-zinc-900/5 dark:hover:bg-white/10">
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{m.caption || "(tanpa caption)"}</span>
                                <span className="text-[11px] text-zinc-400">
                                  {(m.timestamp ?? "").slice(0, 10)}{m.media_type ? ` • ${m.media_type}` : ""}
                                </span>
                              </span>
                              <button
                                onClick={() => linkTo(m.id)}
                                disabled={igBusy}
                                className="shrink-0 font-medium text-brand-700 hover:underline disabled:opacity-50 dark:text-brand-400"
                              >
                                Hubungkan
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button onClick={() => setLinking(false)} className="text-[11px] text-zinc-500 hover:underline">
                          Batal
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
          </section>
          )}
          </div>

          <div className="mt-auto shrink-0 pt-6">
          {igMetrics && (
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {[
                { label: "Views", value: igMetrics.views, icon: Eye },
                { label: "Reach", value: igMetrics.reach, icon: Users },
                { label: "Likes", value: igMetrics.likes, icon: Heart },
                { label: "Komentar", value: igMetrics.comments, icon: MessageCircle },
                { label: "Shares", value: igMetrics.shares, icon: Share2 },
                { label: "Saves", value: igMetrics.saves, icon: Bookmark },
              ].map((s, i, arr) => (
                <span key={s.label} title={s.label} className={cn("inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300", i === arr.length - 1 && "ml-auto")}>
                  <s.icon className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="font-medium">{s.value.toLocaleString("id-ID")}</span>
                </span>
              ))}
            </div>
          )}

          <section className="mt-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") postComment();
                }}
                placeholder="Tulis komentar…"
                className={input}
              />
              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                onClick={postComment}
                disabled={!comment.trim()}
              >
                Kirim
              </button>
            </div>
          </section>
          </div>

        </div>
      </div>
    </div>
  );
}
