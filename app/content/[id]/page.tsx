"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  changeStatus,
  deleteContent,
  getContent,
  type ContentDetail,
} from "@/lib/content-db";
import { thumbUrl } from "@/lib/drive/thumb";
import { consumeMediaWarning, consumeSaved } from "@/lib/ui-flags";
import type { IgComment, IgInsights, IgPreview } from "@/lib/instagram/client";

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
const dangerPill =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50";

function fmtIgTime(ts: string) {
  const d = new Date(ts);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }
  return ts.slice(0, 10);
}

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
  // Komentar asli Instagram (ganti total komentar internal).
  const [igComments, setIgComments] = useState<IgComment[]>([]);
  const [igCommentsLoading, setIgCommentsLoading] = useState(false);
  const [igCommentsError, setIgCommentsError] = useState<string | null>(null);
  // Balasan disembunyikan dulu ala IG — dibuka per komentar.
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  // Kirim komentar/balasan ke IG asli (atas nama akun bisnis terhubung).
  // Klik Balas di item mana pun → input bawah terisi @username + fokus,
  // kirimnya tetap sebagai balasan ke komentar yg dipilih.
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; username: string; parentId: string } | null>(null);
  // Nama terakhir yg tetap dirender saat animasi tutup (biar tak hilang instan).
  const [lastReply, setLastReply] = useState<{ id: string; username: string; parentId: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  function startReply(target: { id: string; username: string }, parentId: string) {
    const next = { id: target.id, username: target.username, parentId };
    setReplyTo(next);
    setLastReply(next);
    setNewComment(`@${target.username} `);
    commentInputRef.current?.focus();
  }
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

  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const blurVideoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);

  const [heroBox, setHeroBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const syncBlur = (paused: boolean) => {
    const blur = blurVideoRef.current;
    const main = mainVideoRef.current;
    if (!blur || !main) return;
    if (paused) {
      blur.pause();
    } else {
      blur.currentTime = main.currentTime;
      blur.play().catch(() => {});
    }
  };

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    function measure() {
      const h = hero!.getBoundingClientRect();
      setHeroBox({
        top: h.top,
        left: h.left,
        width: h.width,
        height: h.height,
      });
    }
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(hero!);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [igPreview?.mediaUrl]);

  useEffect(() => {
    const main = mainVideoRef.current;
    if (!main) return;

    const onPlay = () => syncBlur(false);
    const onPause = () => syncBlur(true);
    const onSeeked = () => {
      const blur = blurVideoRef.current;
      if (blur) blur.currentTime = main.currentTime;
    };

    main.addEventListener("play", onPlay);
    main.addEventListener("pause", onPause);
    main.addEventListener("seeked", onSeeked);
    return () => {
      main.removeEventListener("play", onPlay);
      main.removeEventListener("pause", onPause);
      main.removeEventListener("seeked", onSeeked);
    };
  }, [igPreview?.mediaUrl]);


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
        setIgCommentsLoading(true);
        setIgCommentsError(null);
        fetch(`/api/instagram/comments?ids=${igId}`)
          .then((r) => r.json())
          .then((j) => {
            const data = j as { comments?: Record<string, IgComment[]>; errors?: Record<string, string>; error?: string };
            if (data.error) throw new Error(data.error);
            const perId = data.errors?.[igId];
            if (perId) throw new Error(perId);
            setIgComments(data.comments?.[igId] ?? []);
          })
          .catch((e: unknown) => {
            setIgComments([]);
            setIgCommentsError(e instanceof Error ? e.message : "Gagal memuat komentar IG.");
          })
          .finally(() => setIgCommentsLoading(false));
      } else {
        setIgPreview(null);
        setIgMetrics(null);
        setIgComments([]);
        setIgCommentsError(null);
        setIgCommentsLoading(false);
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

  async function postToIg(body: { igMediaId: string; message: string; replyToCommentId?: string }) {
    const res = await fetch("/api/instagram/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) throw new Error(json?.error ?? `Posting gagal (HTTP ${res.status}).`);
  }

  async function sendComment() {
    const igId = detail?.igMediaId;
    if (!igId || !newComment.trim() || posting) return;
    setActionError(null);
    setPosting(true);
    try {
      await postToIg({
        igMediaId: igId,
        message: newComment.trim(),
        ...(replyTo ? { replyToCommentId: replyTo.id } : {}),
      });
      const parent = replyTo?.parentId;
      setNewComment("");
      setReplyTo(null);
      if (parent) setOpenReplies((p) => ({ ...p, [parent]: true }));
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Gagal mengirim komentar.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      {/* Blur glow — portaled outside overflow-hidden wrapper so it covers navbar/sidebar */}
      {heroBox && createPortal(
        <div
          className="pointer-events-none fixed z-[1]"
          style={{
            top: heroBox.top - heroBox.height,
            left: heroBox.left - heroBox.width,
            width: heroBox.width * 3,
            height: heroBox.height * 3,
          }}
        >
          {heroIgIsVideo ? (
            <video
              ref={blurVideoRef}
              src={igPreview?.mediaUrl}
              loop
              muted
              playsInline
              preload="auto"
              aria-hidden
              className="h-full w-full object-cover opacity-20 blur-xl"
              style={{ maskImage: "radial-gradient(ellipse at center, black 5%, transparent 55%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 5%, transparent 55%)" }}
            />
          ) : heroIgUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={heroIgUrl}
              alt=""
              aria-hidden
              className="h-full w-full object-cover opacity-20 blur-xl"
              style={{ maskImage: "radial-gradient(ellipse at center, black 5%, transparent 55%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 5%, transparent 55%)" }}
            />
          ) : heroDriveId ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={thumbUrl(heroDriveId!)}
              alt=""
              aria-hidden
              className="h-full w-full object-cover opacity-20 blur-xl"
              style={{ maskImage: "radial-gradient(ellipse at center, black 5%, transparent 55%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 5%, transparent 55%)" }}
            />
          ) : null}
        </div>,
        document.body
      )}
      <div ref={pageWrapRef} className="relative z-0 -mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
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

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
        {/* Main */}
        <div className="min-w-0 space-y-6 lg:shrink-0">
          {heroIgUrl || heroDriveId ? (
            <div ref={heroRef} className="relative overflow-visible rounded-lg lg:w-fit">
              {heroIgUrl ? (
                heroIgIsVideo ? (
                  <div className="relative">
                    <video
                      ref={mainVideoRef}
                      src={igPreview?.mediaUrl}
                      poster={igPreview?.thumbUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      onPlay={() => syncBlur(false)}
                      onPause={() => syncBlur(true)}
                      className="relative z-10 h-auto w-full rounded-lg bg-black lg:h-[520px] lg:w-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroIgUrl}
                      alt={detail.title}
                      loading="lazy"
                      className="relative z-10 h-auto w-full max-w-full rounded-lg lg:h-[520px] lg:w-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )
              ) : (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbUrl(heroDriveId!)}
                    alt={detail.title}
                    loading="lazy"
                    className="relative z-10 h-auto w-full max-w-full rounded-lg lg:h-[520px] lg:w-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
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
        <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-y-auto lg:sticky lg:top-20 lg:max-h-[520px]">
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

          <div className="mt-4 space-y-3 lg:pr-1">
            {igCommentsLoading ? (
              <p className="text-xs text-zinc-500">Memuat komentar IG…</p>
            ) : igCommentsError ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {igCommentsError} Token butuh permission instagram_manage_comments.
              </p>
            ) : !detail.igMediaId ? (
              <p className="text-xs text-zinc-500">Belum tertaut ke postingan IG.</p>
            ) : igComments.length === 0 ? (
              <p className="text-xs text-zinc-500">Belum ada komentar di Instagram.</p>
            ) : (
              <ul className="space-y-3">
                {igComments.map((c) => (
                  <li key={c.id} className="flex gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {initials(c.username)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="text-xs font-semibold">{c.username}</span>
                        <span className="ml-2">{c.text}</span>
                      </p>
                      <p className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
                        {c.timestamp && <span>{fmtIgTime(c.timestamp)}</span>}
                        {!!c.likeCount && <span>{c.likeCount} suka</span>}
                        <button
                          type="button"
                          onClick={() => startReply(c, c.id)}
                          className="font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          Balas
                        </button>
                      </p>
                      {(c.replies?.length ?? 0) > 0 && (
                        <div className="mt-1.5">
                          {/* Buka-tutup smooth via animasi grid-rows (pola yg sama di tabel).
                              Kedua sisi ikut dianimasikan agar tak ada yg muncul/hilang instan. */}
                          <div
                            className={cn(
                              "grid transition-all duration-150 ease-in-out",
                              openReplies[c.id]
                                ? "grid-rows-[0fr] opacity-0 invisible"
                                : "grid-rows-[1fr] opacity-100 visible delay-300"
                            )}
                          >
                            {/* Buka = meluncur ke bawah, tutup = ikut naik ke atas. */}
                            <div
                              className={cn(
                                "overflow-hidden transition-transform duration-300 ease-in-out",
                                openReplies[c.id] ? "translate-y-2" : "translate-y-0"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setOpenReplies((p) => ({ ...p, [c.id]: true }))}
                                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                              >
                                — View replies ({c.replies!.length})
                              </button>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "grid transition-all duration-300 ease-in-out",
                              openReplies[c.id]
                                ? "grid-rows-[1fr] opacity-100 visible delay-150"
                                : "grid-rows-[0fr] opacity-0 invisible"
                            )}
                          >
                            {/* Buka = turun dari atas, tutup = naik ke atas. */}
                            <div
                              className={cn(
                                "overflow-hidden transition-transform duration-300 ease-in-out",
                                openReplies[c.id] ? "translate-y-0" : "-translate-y-2"
                              )}
                            >
                              <ul className="mt-2 space-y-2">
                                {c.replies!.map((r) => (
                                  <li key={r.id} className="flex gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                      {initials(r.username)}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm">
                                        <span className="text-xs font-semibold">{r.username}</span>
                                        <span className="ml-2">{r.text}</span>
                                      </p>
                                      <p className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
                                        {r.timestamp && <span>{fmtIgTime(r.timestamp)}</span>}
                                        <button
                                          type="button"
                                          onClick={() => startReply(r, c.id)}
                                          className="font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
                                        >
                                          Balas
                                        </button>
                                      </p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              <button
                                type="button"
                                onClick={() => setOpenReplies((p) => ({ ...p, [c.id]: false }))}
                                className="mt-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                              >
                                — Hide replies
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
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

          <div className="mt-auto shrink-0 pt-4">
          {igMetrics && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
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
            {/* Muncul/hilang smooth via animasi grid-rows. */}
            <div
              className={cn(
                "grid transition-all duration-200 ease-in-out",
                replyTo ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                {(replyTo ?? lastReply) && (
                  <p className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
                    <span>
                      Membalas <span className="font-semibold">@{(replyTo ?? lastReply)!.username}</span>
                    </span>
                    <button
                      type="button"
                      aria-label="Batal membalas"
                      onClick={() => {
                        setReplyTo(null);
                        setNewComment("");
                      }}
                      className="rounded-full px-1 font-medium hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      ✕
                    </button>
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                ref={commentInputRef}
                value={newComment}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewComment(v);
                  // Mention @username diutak-atik (walau 1 huruf) = mode balas batal otomatis.
                  if (replyTo && !v.startsWith(`@${replyTo.username} `)) setReplyTo(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendComment();
                  if (e.key === "Escape" && replyTo) {
                    setReplyTo(null);
                    setNewComment("");
                  }
                }}
                placeholder={detail.igMediaId ? "Tulis komentar sebagai akun IG…" : "Belum tertaut ke postingan IG."}
                disabled={!detail.igMediaId || posting}
                className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 disabled:opacity-50 dark:border-[#4c4c4c] dark:text-zinc-100"
              />
              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                onClick={() => void sendComment()}
                disabled={!newComment.trim() || posting}
              >
                {posting ? "…" : "Kirim"}
              </button>
            </div>
          </section>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}
