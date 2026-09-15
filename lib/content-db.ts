// Lapisan data konten: Supabase bila dikonfigurasi, fallback ke
// content-store (mock + localStorage) bila tidak. Bentuk data yang
// dikembalikan selalu ManagedContent/ContentDetail agar UI tidak berubah.
import { getBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import type { DbComment, DbContent, DbStatusHistory } from "./supabase/types";
import {
  addContentComment as fallbackComment,
  changeContentStatus as fallbackStatus,
  createContentItem as fallbackCreate,
  deleteContentItem as fallbackDelete,
  getAllContent as fallbackAll,
  getContentDetail as fallbackDetail,
  saveContentItem as fallbackSave,
  type ContentDetail,
} from "./content-store";
import type { ContentStatus, HistoryEntry, ManagedContent } from "./mock";

function toItem(row: DbContent): ManagedContent {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time.slice(0, 5),
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
  const supabase = getBrowserClient();
  if (!supabase) return sweepView(fallbackAll());
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });
  if (error) throw new Error(error.message);
  await sweepSupabase(supabase, (data as DbContent[]).filter((r) => r.status === "scheduled"));
  return (data as DbContent[]).map(toItem);
}

export async function getContent(id: string): Promise<ContentDetail | undefined> {
  const supabase = getBrowserClient();
  if (!supabase) {
    const d = fallbackDetail(id);
    return d && isDueScheduled(d) ? { ...d, status: "published" } : d;
  }
  const [{ data: row, error }, hist, comm] = await Promise.all([
    supabase.from("contents").select("*").eq("id", id).single(),
    supabase.from("content_status_history").select("*").eq("content_id", id).order("changed_at", { ascending: true }),
    supabase.from("content_comments").select("*").eq("content_id", id).order("created_at", { ascending: true }),
  ]);
  if (error || !row) return undefined;
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
    | "title" | "type" | "status" | "scheduledDate" | "scheduledTime" | "pic"
    | "caption" | "hashtags" | "category" | "notes" | "slides"
  > & { initials: string }
): Promise<string> {
  const id = `c-${Date.now().toString(36)}`;
  const supabase = getBrowserClient();
  if (!supabase) {
    const today = new Date().toISOString().slice(0, 10);
    fallbackCreate({
      id,
      title: input.title,
      type: input.type,
      status: input.status,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      pic: input.pic,
      initials: input.initials,
      caption: input.caption,
      hashtags: input.hashtags,
      category: input.category,
      notes: input.notes,
      createdAt: today,
      updatedAt: today,
      tone: "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900",
      ...(input.slides !== undefined ? { slides: input.slides } : {}),
    });
    return id;
  }
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
  const supabase = getBrowserClient();
  if (!supabase) {
    fallbackSave(id, patch);
    return;
  }
  const db: Partial<Record<string, string | number | null>> = {};
  if (patch.title !== undefined) db.title = patch.title;
  if (patch.type !== undefined) db.type = patch.type;
  if (patch.caption !== undefined) db.caption = patch.caption;
  if (patch.hashtags !== undefined) db.hashtags = patch.hashtags;
  if (patch.category !== undefined) db.category = patch.category;
  if (patch.pic !== undefined) db.pic_name = patch.pic;
  if (patch.scheduledDate !== undefined) db.scheduled_date = patch.scheduledDate;
  if (patch.scheduledTime !== undefined) db.scheduled_time = patch.scheduledTime;
  if (patch.notes !== undefined) db.notes = patch.notes;
  if (patch.slides !== undefined) db.slides = patch.slides ?? null;
  const { error } = await supabase.from("contents").update(db).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function changeStatus(id: string, to: ContentStatus) {
  const supabase = getBrowserClient();
  if (!supabase) {
    fallbackStatus(id, to);
    return;
  }
  const { error } = await supabase.from("contents").update({ status: to }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("content_status_history").insert({ content_id: id, status: to });
}

export async function addComment(id: string, text: string, author = "Tim KAWAKU") {
  const supabase = getBrowserClient();
  if (!supabase) {
    fallbackComment(id, text, author);
    return;
  }
  const { error } = await supabase
    .from("content_comments")
    .insert({ content_id: id, author_name: author, text });
  if (error) throw new Error(error.message);
}

// Hapus konten: mock langsung dari localStorage, Supabase via API (admin).
export async function deleteContent(id: string) {
  if (!isSupabaseConfigured()) {
    fallbackDelete(id);
    return;
  }
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

function sweepView(items: ManagedContent[]): ManagedContent[] {
  return items.map((c) => (isDueScheduled(c) ? { ...c, status: "published" as const } : c));
}

async function sweepSupabase(
  supabase: NonNullable<ReturnType<typeof getBrowserClient>>,
  rows: DbContent[]
): Promise<void> {
  for (const r of rows) {
    if (
      !isDueScheduled({
        status: r.status as ContentStatus,
        scheduledDate: r.scheduled_date,
        scheduledTime: r.scheduled_time,
      })
    )
      continue;
    try {
      await supabase.from("contents").update({ status: "published" }).eq("id", r.id);
      await supabase.from("content_status_history").insert({ content_id: r.id, status: "published" });
      (r as { status: string }).status = "published";
    } catch {
      /* viewer tanpa hak tulis: biarkan tampil scheduled */
    }
  }
}

// Ganti relasi konten ↔ media (mock: no-op; Supabase: array kosong = lepas semua).
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
