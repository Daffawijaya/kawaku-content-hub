// Lapisan data konten: Supabase only. Tanpa fallback dummy — gagal
// konfigurasi/koneksi = error eksplisit agar UI tak menampilkan angka palsu.
import { getBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import type { DbComment, DbContent, DbStatusHistory } from "./supabase/types";
import type { Comment, ContentStatus, HistoryEntry, ManagedContent } from "./mock";
import type { IgPreview } from "./instagram/client";

export type ContentDetail = ManagedContent & {
  history: HistoryEntry[];
  comments: Comment[];
};

function needSupabase() {
  const supabase = getBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  return supabase;
}

// SATU PINTU arsip: ig_media_id yg tertaut tapi tak terbaca IG
// (diarsip/dihapus) disembunyikan dari SEMUA pembaca data — list, detail,
// hitungan. Cache per-id 5 mnt; gagal total = fail-open (tampil semua)
// agar error IG/login tak mengosongkan app.
const archiveCache = new Map<string, { archived: boolean; exp: number }>();

async function fetchPreviews(ids: string[]): Promise<Record<string, IgPreview> | null> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
  const out: Record<string, IgPreview> = {};
  let ok = false;
  await Promise.all(
    chunks.map(async (ch) => {
      try {
        const res = await fetch(`/api/instagram/insights?ids=${ch.join(",")}`);
        const j = (await res.json()) as { ok?: boolean; previews?: Record<string, IgPreview> };
        if (!j.ok) return;
        ok = true;
        Object.assign(out, j.previews ?? {});
      } catch {
        /* chunk gagal → abaikan */
      }
    })
  );
  return ok ? out : null;
}

async function archivedIdSet(ids: string[]): Promise<Set<string>> {
  const now = Date.now();
  const out = new Set<string>();
  const missing = ids.filter((id) => {
    const hit = archiveCache.get(id);
    if (hit && hit.exp > now) {
      if (hit.archived) out.add(id);
      return false;
    }
    return true;
  });
  if (missing.length > 0) {
    const previews = await fetchPreviews(missing);
    if (previews) {
      for (const id of missing) {
        const archived = !previews[id];
        archiveCache.set(id, { archived, exp: now + 5 * 60 * 1000 });
        if (archived) out.add(id);
      }
    }
  }
  return out;
}

export function toItem(row: DbContent): ManagedContent {
  return {
    id: row.id,
    title: row.title,
    // Tipe asing (mis. sisa "story" lama) dipetakan ke feed agar
    // satu baris bandel tak meruntuhkan seluruh halaman.
    type: row.type === "feed" || row.type === "carousel" || row.type === "reels" ? row.type : "feed",
    status: row.status,
    scheduledDate: row.scheduled_date ?? "",
    scheduledTime: row.scheduled_time?.slice(0, 5) ?? "",
    pic: row.pic_name,
    initials: row.pic_initials,
    caption: row.caption,
    hashtags: row.hashtags,
    category: row.category,
    notes: row.notes,
    createdAt: row.created_at.slice(0, 10),
    updatedAt: row.updated_at.slice(0, 10),
    tone: "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900",
    slides: row.slides ?? undefined,
    igMediaId: row.ig_media_id ?? undefined,
    publishedUrl: row.published_url ?? undefined,
    igSyncError: row.ig_sync_error ?? undefined,
    postRole: row.post_role ?? undefined,
  };
}

function toHistory(rows: DbStatusHistory[]): HistoryEntry[] {
  return rows.map((h) => ({
    status: h.status as ContentStatus,
    at: h.changed_at,
    by: h.changed_by ?? "Tim KAWAKU",
  }));
}

function toComments(rows: DbComment[]) {
  return rows.map((c) => ({
    id: c.id,
    author: c.author_name,
    text: c.text,
    at: c.created_at.slice(0, 10),
  }));
}

export async function listContents(): Promise<ManagedContent[]> {
  const supabase = needSupabase();
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });
  if (error) throw new Error(error.message);
  // Hanya milik sendiri — collab dicuekin di seluruh app (NULL = owner).
  const owned = (data as DbContent[]).filter((r) => (r.post_role ?? "owner") === "owner");
  // Arsip IG disembunyikan di sini (satu pintu) — semua halaman konsisten.
  const archived = await archivedIdSet(
    owned.filter((r) => r.ig_media_id).map((r) => r.ig_media_id as string)
  );
  const visible = owned.filter((r) => !r.ig_media_id || !archived.has(r.ig_media_id));
  await sweepSupabase(supabase, visible.filter((r) => r.status === "scheduled"));
  return visible.map(toItem);
}

export async function getContent(id: string): Promise<ContentDetail | undefined> {
  const supabase = needSupabase();
  const [{ data: row, error }, hist, comm] = await Promise.all([
    supabase.from("contents").select("*").eq("id", id).single(),
    supabase.from("content_status_history").select("*").eq("content_id", id).order("changed_at", { ascending: true }),
    supabase.from("content_comments").select("*").eq("content_id", id).order("created_at", { ascending: true }),
  ]);
  if (error || !row) return undefined;
  // Collab bukan bagian app — anggap tidak ada.
  if (((row as DbContent).post_role ?? "owner") !== "owner") return undefined;
  // Arsip IG: satu pintu, sama seperti list.
  const igId = (row as DbContent).ig_media_id;
  if (igId && (await archivedIdSet([igId])).has(igId)) return undefined;
  await sweepSupabase(supabase, [row as DbContent].filter((r) => r.status === "scheduled"));
  return {
    ...toItem(row as DbContent),
    history: toHistory((hist.data ?? []) as DbStatusHistory[]),
    comments: toComments((comm.data ?? []) as DbComment[]),
  };
}

export async function createContent(
  input: Pick<
    ManagedContent,
    "title" | "type" | "status" | "pic" | "caption" | "hashtags" | "category" | "notes" | "slides"
  > & { initials: string; scheduledDate: string | null; scheduledTime: string | null }
): Promise<string> {
  const id = `c-${Date.now().toString(36)}`;
  const supabase = needSupabase();
  const { error } = await supabase.from("contents").insert({
    id,
    title: input.title,
    type: input.type,
    status: input.status,
    scheduled_date: input.scheduledDate,
    scheduled_time: input.scheduledTime,
    pic_name: input.pic,
    pic_initials: input.initials,
    caption: input.caption,
    hashtags: input.hashtags,
    category: input.category,
    notes: input.notes,
    slides: input.slides ?? null,
  });
  if (error) throw new Error(error.message);
  await supabase.from("content_status_history").insert({ content_id: id, status: input.status });
  return id;
}

export async function saveContent(id: string, patch: Partial<ManagedContent>) {
  const supabase = needSupabase();
  const db: Partial<Record<string, string | number | null>> = {};
  if (patch.title !== undefined) db.title = patch.title;
  if (patch.type !== undefined) db.type = patch.type;
  if (patch.caption !== undefined) db.caption = patch.caption;
  if (patch.hashtags !== undefined) db.hashtags = patch.hashtags;
  if (patch.category !== undefined) db.category = patch.category;
  if (patch.pic !== undefined) db.pic_name = patch.pic;
  if (patch.scheduledDate !== undefined) db.scheduled_date = patch.scheduledDate || null;
  if (patch.scheduledTime !== undefined) db.scheduled_time = patch.scheduledTime || null;
  if (patch.notes !== undefined) db.notes = patch.notes;
  if (patch.slides !== undefined) db.slides = patch.slides ?? null;
  const { error } = await supabase.from("contents").update(db).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function changeStatus(id: string, to: ContentStatus) {
  const supabase = needSupabase();
  // Turun ke stok = jadwal ikut hilang (kolom nullable, lihat migration_nullable_schedule).
  const { error } = await supabase
    .from("contents")
    .update(to === "idea" ? { status: to, scheduled_date: null, scheduled_time: null } : { status: to })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("content_status_history").insert({ content_id: id, status: to });
}

export async function addComment(id: string, text: string, author = "Tim KAWAKU") {
  const supabase = needSupabase();
  const { error } = await supabase
    .from("content_comments")
    .insert({ content_id: id, author_name: author, text });
  if (error) throw new Error(error.message);
}

// Hapus konten via API (admin).
export async function deleteContent(id: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase belum dikonfigurasi.");
  const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Hapus gagal (HTTP ${res.status}).`);
}

export function usesSupabase() {
  return isSupabaseConfigured();
}

// Jadwal terlewat (WITA) = otomatis published. Dipanggil tiap baca list/detail,
// jadi tidak perlu cron. Gagal tulis (mis. viewer) diabaikan: tampil apa adanya.
export function isDueScheduled(c: {
  status: ContentStatus;
  scheduledDate: string;
  scheduledTime: string;
}): boolean {
  if (c.status !== "scheduled") return false;
  const t = Date.parse(`${c.scheduledDate}T${c.scheduledTime.slice(0, 5)}:00+08:00`);
  return !Number.isNaN(t) && t <= Date.now();
}

export async function sweepSupabase(
  supabase: NonNullable<ReturnType<typeof getBrowserClient>>,
  rows: DbContent[]
): Promise<void> {
  // Bila IG aktif, due tanpa ig_media_id = jatah cron autopublish — jangan
  // tulis published palsu di sini (apalagi menimpa error publish yg terlihat).
  const igOn = await isIgConfiguredCached();
  for (const r of rows) {
    if (
      !isDueScheduled({
        status: r.status as ContentStatus,
        scheduledDate: r.scheduled_date ?? "",
        scheduledTime: r.scheduled_time ?? "",
      })
    )
      continue;
    if (igOn && !r.ig_media_id) continue;
    try {
      await supabase.from("contents").update({ status: "published" }).eq("id", r.id);
      await supabase.from("content_status_history").insert({ content_id: r.id, status: "published" });
      (r as { status: string }).status = "published";
    } catch {
      /* viewer tanpa hak tulis: biarkan tampil scheduled */
    }
  }
}

// Status IG di-cache 5 mnt agar tiap baca list tidak menambah request.
let igStatusCache: { v: boolean; exp: number } | null = null;
async function isIgConfiguredCached(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (igStatusCache && igStatusCache.exp > Date.now()) return igStatusCache.v;
  try {
    const res = await fetch("/api/instagram/status");
    const json = (await res.json()) as { instagram?: boolean };
    igStatusCache = { v: !!json?.instagram, exp: Date.now() + 5 * 60 * 1000 };
    return igStatusCache.v;
  } catch {
    return false;
  }
}

// Ganti relasi konten ↔ media (array kosong = lepas semua).
export async function setContentMedia(id: string, mediaIds: string[]) {
  if (!isSupabaseConfigured()) return;
  const res = await fetch(`/api/content/${id}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaIds }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error ?? "Gagal menyimpan relasi media.");
  }
}

export type ContentThumb = { driveFileId: string; kind: string };

export type ContentListPage = {
  items: ManagedContent[];
  total: number;
  thumbs: Record<string, ContentThumb>;
  previews: Record<string, IgPreview>;
};

// Daftar paginasi dari BE (filter + sort + thumbs + preview IG sekaligus).
export async function listContentsPage(params: {
  page: number;
  limit: number;
  types: string[];
  statuses: string[];
  q: string;
}): Promise<ContentListPage> {
  const sp = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    types: params.types.join(","),
    statuses: params.statuses.join(","),
    q: params.q,
  });
  const res = await fetch(`/api/content?${sp}`);
  const json = (await res.json().catch(() => null)) as (Partial<ContentListPage> & {
    error?: string;
  }) | null;
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat konten.");
  return {
    items: json?.items ?? [],
    total: json?.total ?? 0,
    thumbs: json?.thumbs ?? {},
    previews: json?.previews ?? {},
  };
}

// Seluruh daftar dari BE (utk board) — 1 request beserta thumbs + previews.
export async function listContentsAll(): Promise<ContentListPage> {
  const res = await fetch(`/api/content?all=1&limit=500`);
  const json = (await res.json().catch(() => null)) as (Partial<ContentListPage> & {
    error?: string;
  }) | null;
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat konten.");
  return {
    items: json?.items ?? [],
    total: json?.total ?? 0,
    thumbs: json?.thumbs ?? {},
    previews: json?.previews ?? {},
  };
}
