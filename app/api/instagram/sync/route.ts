import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { isInstagramConfigured } from "@/lib/instagram/config";
import { listRecentMedia, type IgMediaType, type IgRecentMedia } from "@/lib/instagram/client";
import { createClient } from "@/lib/supabase/server";

// POST: polling media terbaru IG → konten yg belum dikenal auto-masuk
// sebagai published + permalink. Dipanggil cron / tombol sync (bukan webhook:
// Meta tidak mengirim event untuk postingan baru).
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

export async function POST() {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }

  const supabase = await createClient();
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
    });
    if (insError) continue;
    await supabase.from("content_status_history").insert({ content_id: id, status: "published" });
    importedIds.push(id);
  }

  await supabase.from("ig_sync_state").upsert({ id: 1, last_sync_at: new Date().toISOString() });
  return NextResponse.json({
    ok: true,
    total: items.length,
    imported: importedIds.length,
    skipped: items.length - fresh.length,
    importedIds,
  });
}
