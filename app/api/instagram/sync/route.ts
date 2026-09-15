import { NextResponse } from "next/server";
import { isInstagramConfigured } from "@/lib/instagram/config";
import {
  listCollaborativeMedia,
  listRecentMedia,
  type IgCollabMedia,
  type IgMediaType,
  type IgRecentMedia,
} from "@/lib/instagram/client";
import { requireCronOrEditor } from "@/lib/instagram/cron";
import { refreshDailyAnalytics } from "@/lib/instagram/aggregate";
import { ensureFreshToken } from "@/lib/instagram/token";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

// Polling media terbaru IG → konten yg belum dikenal auto-masuk
// sebagai published + permalink. GET utk cron, POST utk tombol manual
// (bukan webhook: Meta tidak mengirim event untuk postingan baru).
const TYPE_MAP: Record<string, string> = {
  IMAGE: "feed",
  VIDEO: "reels",
  REELS: "reels",
  CAROUSEL_ALBUM: "carousel",
  STORY: "story",
};

function titleOf(m: IgRecentMedia): string {
  const words = (m.caption ?? "").split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
  if (words) return words;
  const d = (m.timestamp ?? "").slice(0, 10) || "baru";
  return `Postingan Instagram ${d}`;
}

// Baris utk sync: bentuk seragam milik & kolab, kolab ditandai + nama pemilik.
type SyncItem = {
  id: string;
  caption?: string;
  media_type?: IgMediaType;
  permalink?: string;
  timestamp?: string;
  role: "owner" | "collaborator";
  ownerUsername?: string;
};

function toItem(m: IgRecentMedia): SyncItem {
  return { id: m.id, caption: m.caption, media_type: m.media_type, permalink: m.permalink, timestamp: m.timestamp, role: "owner" };
}

function collabToItem(m: IgCollabMedia): SyncItem {
  return {
    id: m.id,
    caption: m.caption,
    media_type: m.media_type,
    permalink: m.permalink,
    timestamp: m.timestamp,
    role: "collaborator",
    ownerUsername: m.username,
  };
}

export async function POST(req: Request) {
  return runSync(req);
}

export async function GET(req: Request) {
  return runSync(req);
}

async function runSync(req: Request) {
  const { supabase, error } = await requireCronOrEditor(req);
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  await ensureFreshToken().catch(() => undefined);
  const { data: state } = await supabase.from("ig_sync_state").select("last_sync_at").eq("id", 1).single();
  const lastSync = (state as { last_sync_at?: string } | null)?.last_sync_at;
  const since = lastSync
    ? Math.floor(new Date(lastSync).getTime() / 1000)
    : Math.floor(Date.now() / 1000) - 7 * 24 * 3600;

  let items: IgRecentMedia[];
  try {
    items = await listRecentMedia({ since, limit: 50 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync IG gagal." },
      { status: 500 }
    );
  }

  // Collab post: akun KAWAKU diundang sbg kolaborator. Endpoint terpisah
  // (tidak muncul di /media). Best-effort — gagal tidak membatalkan sync utama.
  let collabs: IgCollabMedia[] = [];
  try {
    collabs = await listCollaborativeMedia({ limit: 200 });
  } catch {
    /* endpoint collab belum tersedia / tidak diizinkan → lanjut tanpa collab */
  }

  // Collab duluan: media yg sama bisa muncul di /media dan /collaborative_media.
  // Dedupe by id dengan collab menang — kalau owner duluan, postingan collab
  // tercatat "Sendiri" dan versi collab-nya di-skip (sudah dikenal).
  const byId = new Map<string, SyncItem>();
  for (const it of [...items.map(toItem), ...collabs.map(collabToItem)]) {
    const ex = byId.get(it.id);
    byId.set(it.id, ex?.role === "collaborator" ? ex : it);
  }
  const all: SyncItem[] = [...byId.values()];
  const ids = all.map((m) => m.id);
  // Ambil post_role juga: baris lama (diimport sblm migrasi collab) bisa
  // salah role "owner" — dikoreksi di bawah dr data collab terkini.
  const known = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("contents").select("ig_media_id,post_role").in("ig_media_id", ids);
    for (const r of ((data ?? []) as { ig_media_id: string | null; post_role: string | null }[])) {
      if (r.ig_media_id) known.set(r.ig_media_id, r.post_role ?? "owner");
    }
  }

  const fresh = all.filter((m) => !known.get(m.id));
  const importedIds: string[] = [];
  for (const m of fresh) {
    const id = `ig-${m.id}`;
    const date = (m.timestamp ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    const time = (m.timestamp ?? "").slice(11, 16) || "09:00";
    const isCollab = m.role === "collaborator";
    const { error: insError } = await supabase.from("contents").insert({
      id,
      title: titleOf(m),
      type: TYPE_MAP[m.media_type as IgMediaType] ?? "feed",
      status: "published",
      scheduled_date: date,
      scheduled_time: time,
      pic_name: isCollab ? `@${m.ownerUsername ?? "kolaborator"}` : "Instagram",
      pic_initials: isCollab ? (m.ownerUsername ?? "KB").slice(0, 2).toUpperCase() : "IG",
      caption: m.caption ?? "",
      hashtags: "",
      category: "",
      notes: isCollab ? "Auto-import dari Instagram (collab post)." : "Auto-import dari Instagram.",
      ig_media_id: m.id,
      published_url: m.permalink ?? null,
      ig_sync_error: null,
      post_role: m.role,
    });
    if (insError) {
      // DB belum dimigrasi (kolom post_role tak ada) → coba tanpa kolom itu
      // agar postingan tetap masuk (role betul menyusul saat backfill di bawah).
      const fallback = {
        id: `ig-${m.id}`,
        title: titleOf(m),
        type: TYPE_MAP[m.media_type as IgMediaType] ?? "feed",
        status: "published",
        scheduled_date: (m.timestamp ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10),
        scheduled_time: (m.timestamp ?? "").slice(11, 16) || "09:00",
        pic_name: isCollab ? `@${m.ownerUsername ?? "kolaborator"}` : "Instagram",
        pic_initials: isCollab ? (m.ownerUsername ?? "KB").slice(0, 2).toUpperCase() : "IG",
        caption: m.caption ?? "",
        hashtags: "",
        category: "",
        notes: isCollab ? "Auto-import dari Instagram (collab post)." : "Auto-import dari Instagram.",
        ig_media_id: m.id,
        published_url: m.permalink ?? null,
        ig_sync_error: null,
      };
      const { error: retryError } = await supabase.from("contents").insert(fallback);
      if (retryError) continue;
    }
    await supabase.from("content_status_history").insert({ content_id: id, status: "published" });
    importedIds.push(id);
  }

  // Backfill role: baris lama yg diimport sblm migrasi collab masih "owner"
  // padahal IG bilang collaborator (ini biang keroknya — sync dulu cuma skip
  // baris yg sudah dikenal, tidak pernah mengoreksi role-nya).
  let fixedRoles = 0;
  for (const m of all) {
    const stored = known.get(m.id);
    if (!stored || stored === m.role) continue;
    const { error } = await supabase
      .from("contents")
      .update({ post_role: m.role })
      .eq("ig_media_id", m.id);
    if (!error) fixedRoles++;
  }

  // Bersihkan collab yg sudah dihapus/di-untag di IG: barisnya tak terbaca
  // lagi dr listing collab (node-nya juga ditolak Meta), jadi hapus dr DB
  // biar tidak jadi baris kosong di Analytics. Guard: listing collab harus
  // sukses (non-kosong) — kalau endpoint gagal, jangan hapus apa pun.
  let removedStale = 0;
  if (collabs.length > 0) {
    const liveCollab = new Set(collabs.map((c) => c.id));
    const { data: dbCollab } = await supabase
      .from("contents")
      .select("id,ig_media_id")
      .eq("post_role", "collaborator")
      .not("ig_media_id", "is", null)
      .limit(1000);
    for (const r of ((dbCollab ?? []) as { id: string; ig_media_id: string | null }[])) {
      if (r.ig_media_id && !liveCollab.has(r.ig_media_id)) {
        const { error } = await supabase.from("contents").delete().eq("id", r.id);
        if (!error) removedStale++;
      }
    }
  }

  await supabase.from("ig_sync_state").upsert({ id: 1, last_sync_at: new Date().toISOString() });

  // Agregat harian real utk /analytics (best-effort; butuh service-role utk tulis).
  let dailyDays = 0;
  try {
    if (isAdminConfigured()) {
      dailyDays = (await refreshDailyAnalytics(createAdminClient())).length;
    }
  } catch {
    /* analytics tetap dibaca apa adanya */
  }
  return NextResponse.json({
    ok: true,
    total: all.length,
    imported: importedIds.length,
    skipped: all.length - fresh.length,
    importedIds,
    fixedRoles,
    removedStale,
    dailyDays,
  });
}
