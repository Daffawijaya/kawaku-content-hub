import { NextResponse } from "next/server";
import { isInstagramConfigured } from "@/lib/instagram/config";
import {
  listActiveStories,
  listRecentMedia,
  type IgMediaType,
  type IgRecentMedia,
} from "@/lib/instagram/client";
import { requireCronOrEditor } from "@/lib/instagram/cron";
import { refreshDailyAnalytics } from "@/lib/instagram/aggregate";
import { igTimestampToWita, nowWita } from "@/lib/time";
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
  STORY: "story",
};

function titleOf(m: IgRecentMedia): string {
  const words = (m.caption ?? "").split(/\s+/).filter(Boolean).slice(0, 8).join(" ");
  if (words) return words;
  const d = (m.timestamp ? (igTimestampToWita(m.timestamp)?.date ?? "") : "") || "baru";
  return m.media_type === "STORY" ? `Story Instagram ${d}` : `Postingan Instagram ${d}`;
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
    // /media tak pernah mengembalikan story — gabung dgn story aktif (24 jam).
    const [recent, stories] = await Promise.all([
      listRecentMedia({ since, limit: 50 }),
      listActiveStories(),
    ]);
    const seen = new Set(recent.map((m) => m.id));
    items = [...stories.filter((m) => !seen.has(m.id)), ...recent];
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
    // Timestamp IG itu UTC — konversi ke wall-clock WITA sebelum disimpan
    // (slice mentah = jam UTC berlabel WITA, mundur 8 jam).
    const wita = m.timestamp ? igTimestampToWita(m.timestamp) : null;
    const fallback = nowWita();
    const date = wita?.date || fallback.date;
    const time = wita?.time || fallback.time || "09:00";
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
      notes: "",
      ig_media_id: m.id,
      published_url: m.permalink ?? null,
      ig_sync_error: null,
      post_role: "owner",
    });
    if (insError) {
      // DB belum dimigrasi (kolom post_role tak ada) → coba tanpa kolom itu.
      const retry = {
        id: `ig-${m.id}`,
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
        notes: "",
        ig_media_id: m.id,
        published_url: m.permalink ?? null,
        ig_sync_error: null,
      };
      const { error: retryError } = await supabase.from("contents").insert(retry);
      if (retryError) continue;
    }
    await supabase.from("content_status_history").insert({ content_id: id, status: "published" });
    importedIds.push(id);
  }

  await supabase.from("ig_sync_state").upsert({ id: 1, last_sync_at: new Date().toISOString() });

  // Perbaikan mandiri: baris auto-import lama yg jamnya masih potongan UTC
  // mentah (bug sebelum konversi WITA) diluruskan dari timestamp live IG.
  // Dipindai dari 100 postingan terbaru TANPA filter since: baris yg sudah
  // lewat jendela sync tak lagi ditemukan di `items`, jadi tak boleh jadi
  // patokan. Hanya milik auto-import (pic_name Instagram) — jadwal
  // manual/link tak tersentuh. Best-effort: gagal = sync tetap sukses.
  let repaired = 0;
  try {
    const [latest, activeStories] = await Promise.all([
      listRecentMedia({ limit: 100 }),
      listActiveStories(),
    ]);
    const seenLatest = new Set(latest.map((m) => m.id));
    const pool = [...activeStories.filter((m) => !seenLatest.has(m.id)), ...latest];
    const cands = pool.filter((m) => m.timestamp);
    if (cands.length > 0) {
      const byIg = new Map(cands.map((m) => [m.id, m]));
      const { data: rows } = await supabase
        .from("contents")
        .select("id,ig_media_id,title,scheduled_date,scheduled_time")
        .in("ig_media_id", cands.map((m) => m.id))
        .eq("pic_name", "Instagram");
      for (const r of ((rows ?? []) as {
        id: string;
        ig_media_id: string | null;
        title: string | null;
        scheduled_date: string | null;
        scheduled_time: string | null;
      }[])) {
        const m = r.ig_media_id ? byIg.get(r.ig_media_id) : undefined;
        const wita = m?.timestamp ? igTimestampToWita(m.timestamp) : null;
        if (!wita?.date || !wita?.time) continue;
        const patch: { scheduled_date?: string; scheduled_time?: string; title?: string } = {};
        if (r.scheduled_date !== wita.date || (r.scheduled_time ?? "").slice(0, 5) !== wita.time) {
          patch.scheduled_date = wita.date;
          patch.scheduled_time = wita.time;
        }
        // Judul otomatis berisi tanggal UTC lama ("Postingan Instagram
        // 2026-09-22") — luruskan tanggalnya; judul isi caption tak tersentuh.
        const autoTitle = r.title?.match(/^(Postingan Instagram|Story Instagram) (\d{4}-\d{2}-\d{2})$/);
        if (autoTitle && autoTitle[2] !== wita.date) patch.title = `${autoTitle[1]} ${wita.date}`;
        if (Object.keys(patch).length === 0) continue;
        const { error: upError } = await supabase.from("contents").update(patch).eq("id", r.id);
        if (!upError) repaired++;
      }
    }
  } catch {
    /* abaikan: import di atas tetap berlaku */
  }

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
    repaired,
    dailyDays,
  });
}
