"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  HardDrive,
  Image as ImageIcon,
  Images,
  Camera,
  LayoutGrid,
  Pencil,
  Send,
  Smartphone,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  mediaLibrary,
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
  usesSupabase,
} from "@/lib/content-db";
import { thumbUrl } from "@/lib/drive/thumb";
import { consumeMediaWarning, consumeSaved, type ContentDetail } from "@/lib/content-store";

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
  story: Smartphone,
};

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
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  // null = pakai relasi mock; array = relasi dari database (mode Supabase).
  const [relatedDb, setRelatedDb] = useState<RelatedAsset[] | null>(null);

  async function refresh() {
    try {
      setDetail((await getContent(id)) ?? null);
      if (usesSupabase()) {
        const res = await fetch(`/api/content/${id}/media`);
        if (res.ok) {
          const json = (await res.json()) as { assets: RelatedAsset[] };
          setRelatedDb(json.assets ?? []);
        }
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
        <Link href="/content" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Kembali ke Content</Button>
        </Link>
      </div>
    );
  }

  const transitions = detail ? (statusTransitions[detail.status] ?? []) : [];
  const relatedMock = mediaLibrary.filter((m) => m.usedBy.includes(detail.id));
  const isRealDriveId = (v: string) => !!v && !v.startsWith("drive_mock_");
  const driveAssets = relatedDb
    ? relatedDb
        .filter((m) => isRealDriveId(m.drive_file_id))
        .map((m) => ({ id: m.id, name: m.name, driveFileId: m.drive_file_id }))
    : relatedMock
        .filter((m) => isRealDriveId(m.driveFileId))
        .map((m) => ({ id: m.driveFileId, name: m.name, driveFileId: m.driveFileId }));
  // Hero: gambar aset pertama (kalau ada file Drive asli).
  const heroDriveId = driveAssets[0]?.driveFileId ?? null;
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
      if (!res.ok) throw new Error(json?.error ?? `Publish gagal (HTTP ${res.status}).`);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Publish ke IG gagal.");
    } finally {
      setIgBusy(false);
    }
  }

  async function unpublishFromIg() {
    if (!detail?.igMediaId) return;
    setActionError(null);
    setIgBusy(true);
    try {
      const res = await fetch(`/api/instagram/media/${detail.igMediaId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? `Hapus dari IG gagal (HTTP ${res.status}).`);
      setConfirmUnpublish(false);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Hapus dari IG gagal.");
      setConfirmUnpublish(false);
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

  return (
    <div>
      <Link
        href="/content"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Content
      </Link>
      <PageHeader
        title={detail.title}
        description={`${fmtDate(detail.scheduledDate)} • ${detail.scheduledTime} WITA`}
        action={
          <span className="flex gap-2">
            {confirmDelete ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Batal
                </Button>
                <Button size="sm" onClick={removeContent} className="bg-rose-600 hover:bg-rose-700">
                  <Trash2 className="h-4 w-4" /> Ya, hapus
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)} title="Hapus (admin)">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <Link href={`/content/${detail.id}/edit`}>
                  <Button size="sm">
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                </Link>
              </>
            )}
          </span>
        }
      />

      {actionError && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {actionError}
        </p>
      )}

      {justSaved && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{" "}
          {usesSupabase() ? "Perubahan tersimpan." : "Perubahan tersimpan (mock) — siap dilanjutkan ke backend."}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <TypeBadge type={detail.type} />
        <StatusBadge status={detail.status} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className={cn("relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br", detail.tone)}>
              <Icon className="h-10 w-10 text-zinc-400" />
              {heroDriveId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbUrl(heroDriveId)}
                  alt={detail.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
            <div className="space-y-2 p-5">
              <p className="whitespace-pre-line text-sm">{detail.caption || "—"}</p>
              {detail.hashtags && (
                <p className="text-sm text-sky-600 dark:text-sky-400">{detail.hashtags}</p>
              )}
              {detail.notes && (
                <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                  <span className="font-medium">Internal note: </span>{detail.notes}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related media ({relatedDb ? relatedDb.length : relatedMock.length})</CardTitle>
              <Link href="/media" className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">
                Open library
              </Link>
            </CardHeader>
            {relatedDb ? (
              relatedDb.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-zinc-500">Belum ada media terhubung.</p>
              ) : (
                <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
                  {relatedDb.map((m) => (
                    <li key={m.id}>
                      <Link
                        href="/media"
                        className="flex items-center gap-2.5 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
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
              )
            ) : relatedMock.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-zinc-500">Belum ada media terhubung.</p>
            ) : (
              <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
                {relatedMock.map((m) => (
                  <li key={m.id}>
                    <Link
                      href="/media"
                      className="flex items-center gap-2.5 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br", m.tone)}>
                        {m.kind === "video" ? (
                          <Clapperboard className="h-4 w-4 text-zinc-500" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-zinc-500" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{m.name}</span>
                        <span className="block text-xs text-zinc-500">{m.sizeLabel}{m.duration ? ` • ${m.duration}` : ""}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments ({detail.comments.length})</CardTitle>
            </CardHeader>
            <div className="space-y-3 px-5 pb-5">
              {detail.comments.length === 0 && (
                <p className="text-sm text-zinc-500">Belum ada komentar.</p>
              )}
              {detail.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {initials(c.author)}
                  </span>
                  <div className="min-w-0 flex-1 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                    <p className="text-xs">
                      <span className="font-semibold">{c.author}</span>
                      <span className="ml-2 text-zinc-400">{fmtDate(c.at)}</span>
                    </p>
                    <p className="mt-0.5 text-sm">{c.text}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") postComment();
                  }}
                  placeholder="Tulis komentar…"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <Button size="sm" onClick={postComment} disabled={!comment.trim()}>
                  <Send className="h-3.5 w-3.5" /> Post
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Side */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Info</CardTitle>
            </CardHeader>
            <dl className="space-y-2.5 px-5 pb-5 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" />
                {fmtDate(detail.scheduledDate)} • {detail.scheduledTime} WITA
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-zinc-400" />
                {detail.pic}
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 shrink-0 text-zinc-400" />
                {detail.category}
              </div>
              <div className="border-t border-zinc-100 pt-2.5 text-xs text-zinc-500 dark:border-zinc-800">
                <p>Created: {fmtDate(detail.createdAt)}</p>
                <p className="mt-0.5">Updated: {fmtDate(detail.updatedAt)}</p>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <div className="space-y-2.5 px-5 pb-5">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Change status
                </span>
                <select
                  value={detail.status}
                  onChange={(e) => applyStatus(e.target.value as (typeof transitions)[number])}
                  disabled={transitions.length === 0}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value={detail.status}>{statusMeta[detail.status].label} (saat ini)</option>
                  {transitions.map((t) => (
                    <option key={t} value={t}>
                      → {transitionLabels[`${detail.status}->${t}`] ?? statusMeta[t].label}
                    </option>
                  ))}
                </select>
              </div>
              {transitions.length > 0 ? (
                transitions.map((t, i) => (
                  <Button
                    key={t}
                    variant={i === 0 ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => applyStatus(t)}
                  >
                    {transitionLabels[`${detail.status}->${t}`] ?? statusMeta[t].label}
                  </Button>
                ))
              ) : (
                <p className="text-xs text-zinc-500">Sudah Published — tidak ada transisi lanjutan.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Drive</CardTitle>
            </CardHeader>
            <div className="space-y-2 px-5 pb-5">
              {driveAssets.length === 0 ? (
                <p className="text-xs text-zinc-500">Belum ada file di Google Drive.</p>
              ) : (
                driveAssets.map((a) => (
                  <a
                    key={a.id}
                    href={`https://drive.google.com/file/d/${a.driveFileId}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <HardDrive className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-zinc-400" />
                  </a>
                ))
              )}
              <p className="text-[11px] text-zinc-400">File tersimpan di folder KAWAKU.</p>
            </div>
          </Card>

          {usesSupabase() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4" /> Instagram
                </CardTitle>
                {detail.publishedUrl && (
                  <a
                    href={detail.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
                  >
                    Lihat postingan
                  </a>
                )}
              </CardHeader>
              <div className="space-y-2 px-5 pb-5">
                {detail.igSyncError && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    {detail.igSyncError}
                  </p>
                )}
                {detail.publishedUrl ? (
                  confirmUnpublish ? (
                    <span className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setConfirmUnpublish(false)}>
                        Batal
                      </Button>
                      <Button size="sm" onClick={unpublishFromIg} disabled={igBusy} className="bg-rose-600 hover:bg-rose-700">
                        <Trash2 className="h-4 w-4" /> Ya, hapus dari IG
                      </Button>
                    </span>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setConfirmUnpublish(true)} title="Hapus dari IG (admin)">
                        <Trash2 className="h-4 w-4" /> Hapus dari IG
                      </Button>
                      <p className="text-[11px] text-zinc-400">Menghapus postingan IG + melepas tautan lokal.</p>
                    </>
                  )
                ) : detail.type === "feed" || detail.type === "reels" ? (
                  <>
                    <Button size="sm" onClick={publishToIg} disabled={igBusy} className="w-full">
                      <Send className="h-4 w-4" /> {igBusy ? "Mempublish…" : "Publish ke IG"}
                    </Button>
                    <p className="text-[11px] text-zinc-400">Media Drive dijadikan publik otomatis saat publish.</p>
                  </>
                ) : (
                  <p className="text-xs text-zinc-500">Tipe {detail.type} menyusul di Fase 2.</p>
                )}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <ol className="space-y-0 px-5 pb-5">
              {detail.history.map((h, i) => (
                <li key={`${h.status}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < detail.history.length - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-zinc-200 dark:bg-zinc-800" />
                  )}
                  <span className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-brand-600 bg-white dark:bg-zinc-950" />
                  <div className="text-xs">
                    <StatusBadge status={h.status} className="px-1.5 py-0 text-[10px]" />
                    <p className="mt-1 text-zinc-500">{fmtDate(h.at)} • {h.by}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
