import { NextResponse } from "next/server";
import { isInstagramConfigured } from "@/lib/instagram/config";
import {
  listRecentMedia,
  type IgMediaType,
  type IgRecentMedia,
} from "@/lib/instagram/client";
import { requireCronOrEditor } from "@/lib/instagram/cron";
import { refreshDailyAnalytics } from "@/lib/instagram/aggregate";
import { ensureFreshToken } from "@/lib/instagram/token";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

// Polling media terbaru IG (milik sendiri saja — collab dicuekin) → konten
// yg belum dikenal auto-masuk sebagai published + permalink. GET utk cron,
// POST utk tombol manual (bukan webhook: Meta tidak mengirim event baru).
const TYPE_MAP: Record<string, string> = {
  IMAGE: "feed",
  VIDEO: "reels",
  REELS: "reels",
  CAROUSEL_ALBUM: "carousel",
};

function titleOf(m: IgRecentMedia): string {
  const words = (m.caption ?? "").split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
  if (words) return words;
  const d = (m.timestamp ?? "").slice(0, 10) || "baru";
  return `Postingan Instagram ${d}`;
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
    // Story dicuekin (bukan tipe konten app) — saring di sini.
    items = (await listRecentMedia({ since, limit: 50 })).filter((m) => m.media_type !== "STORY");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync IG gagal." },
      { status: 500 }
    );
  }

  const ids = items.map((m) => m.id);
  const known = new Set<string>();
  if (ids.length > 0) {
    const { data } = await supabase.from("contents").select("ig_media_id").in("ig_media_id", ids);
    for (const r of ((data ?? []) as { ig_media_id: string | null }[])) {
      if (r.ig_media_id) known.add(r.ig_media_id);
    }
  }

  const fresh = items.filter((m) => !known.has(m.id));
  const importedIds: string[] = [];
  for (const m of fresh) {
    const id = `ig-${m.id}`;
    const date = (m.timestamp ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
    const time = (m.timestamp ?? "").slice(11, 16) || "09:00";
    const { error: insError } = await supabase.from("contents").insert({
      id,
      title: titleOf(m),
      type: TYPE_MAP[m.media_type as IgMediaType] ?? "feed",
      status: "published",
      scheduled_date: date,
      scheduled_time: time,
      pic_name: "Instagram",
      pic_initials: "IG",
      caption: m.caption ?? "",
      hashtags: "",
      category: "",
      notes: "Auto-import dari Instagram.",
      ig_media_id: m.id,
      published_url: m.permalink ?? null,
      ig_sync_error: null,
      post_role: "owner",
    });
    if (insError) {
      // DB belum dimigrasi (kolom post_role tak ada) → coba tanpa kolom itu.
      const fallback = {
        id: `ig-${m.id}`,
        title: titleOf(m),
        type: TYPE_MAP[m.media_type as IgMediaType] ?? "feed",
        status: "published",
        scheduled_date: (m.timestamp ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10),
        scheduled_time: (m.timestamp ?? "").slice(11, 16) || "09:00",
        pic_name: "Instagram",
        pic_initials: "IG",
        caption: m.caption ?? "",
        hashtags: "",
        category: "",
        notes: "Auto-import dari Instagram.",
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
    total: items.length,
    imported: importedIds.length,
    skipped: items.length - fresh.length,
    importedIds,
    dailyDays,
  });
}
