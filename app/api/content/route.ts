import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sweepSupabase, toItem, type ContentThumb } from "@/lib/content-db";
import type { DbContent } from "@/lib/supabase/types";
import { getMediaPreview, type IgPreview } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/content?page=&limit=&types=&statuses=&q= — daftar ringan utk /content.
// Filter + sort global + pagination dikerjakan di sini (BE); browser terima
// 1 halaman jadi (items + total + thumbs + previews). GET: user login (baca).

// Urutan grup: stok → scheduled → published, terbaru dulu per grup.
const RANK: Record<string, number> = { idea: 0, scheduled: 1, published: 2 };

// Karakter spesial pola LIKE + koma (pemisah or()) dibersihkan dari keyword.
function escLike(s: string) {
  return s.replace(/,/g, " ").replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(500, Math.max(1, Number(sp.get("limit")) || 10));
  // all=1 → seluruh hasil (utk kanban board), tetap 1 request.
  const all = sp.get("all") === "1";
  const types = sp.get("types")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const statuses = sp.get("statuses")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const q = sp.get("q")?.trim() ?? "";

  // 1. Kolom ringan seluruh hasil filter → sort global di sini.
  // (ORDER BY CASE tak didukung supabase-js; payload id tetap kecil.)
  let idq = supabase
    .from("contents")
    .select("id,status,scheduled_date,scheduled_time", { count: "exact" })
    .or("post_role.eq.owner,post_role.is.null");
  if (types.length > 0) idq = idq.in("type", types);
  if (statuses.length > 0) idq = idq.in("status", statuses);
  if (q) {
    const p = `%${escLike(q)}%`;
    idq = idq.or(`title.ilike.${p},caption.ilike.${p},pic_name.ilike.${p}`);
  }
  const { data: idRows, error: idErr, count } = await idq;
  if (idErr) return NextResponse.json({ error: idErr.message }, { status: 500 });
  const total = count ?? 0;
  type IdRow = { id: string; status: string; scheduled_date: string; scheduled_time: string };
  const sorted = ((idRows ?? []) as IdRow[]).sort(
    (a, b) =>
      (RANK[a.status] ?? 99) - (RANK[b.status] ?? 99) ||
      b.scheduled_date.localeCompare(a.scheduled_date) ||
      b.scheduled_time.localeCompare(a.scheduled_time)
  );
  const pageIds = (all ? sorted : sorted.slice((page - 1) * limit, page * limit)).map((r) => r.id);
  if (pageIds.length === 0) {
    return NextResponse.json({ items: [], total, thumbs: {}, previews: {} });
  }

  // 2. Baris penuh halaman ini (IN tak menjamin urutan → susun ulang).
  const { data: rows, error: rowErr } = await supabase.from("contents").select("*").in("id", pageIds);
  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
  const byId = new Map(((rows ?? []) as DbContent[]).map((r) => [r.id, r]));
  const ordered = pageIds.map((id) => byId.get(id)).filter((r): r is DbContent => !!r);

  // 3. Sweep jadwal terlewat (konsisten dgn listContents) — best effort.
  try {
    await sweepSupabase(supabase, ordered.filter((r) => r.status === "scheduled"));
  } catch {
    /* abaikan: tampil apa adanya */
  }

  // 4. Thumbnail Drive pertama tiap konten (join relasi).
  const { data: rel } = await supabase
    .from("content_media")
    .select("content_id, media_assets(kind,drive_file_id)")
    .in("content_id", pageIds);
  const thumbs: Record<string, ContentThumb> = {};
  for (const r of (rel ?? []) as unknown as {
    content_id: string;
    media_assets: { kind: string; drive_file_id: string } | null;
  }[]) {
    const a = r.media_assets;
    if (!thumbs[r.content_id] && a?.drive_file_id && !a.drive_file_id.startsWith("drive_mock_")) {
      thumbs[r.content_id] = { driveFileId: a.drive_file_id, kind: a.kind };
    }
  }

  // 5. Preview IG utk yg tertaut (null = arsip → sembunyikan dari halaman).
  const previews: Record<string, IgPreview> = {};
  const archived = new Set<string>();
  if (isInstagramConfigured()) {
    await Promise.all(
      ordered
        .filter((r) => r.ig_media_id)
        .map(async (r) => {
          const p = await getMediaPreview(r.ig_media_id as string);
          if (p) previews[r.ig_media_id as string] = p;
          else archived.add(r.id);
        })
    );
  }
  const items = ordered.filter((r) => !archived.has(r.id)).map((r) => toItem(r));
  return NextResponse.json({ items, total, thumbs, previews });
}
