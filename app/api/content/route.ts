import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sweepSupabase, toItem, type ContentThumb } from "@/lib/content-db";
import type { DbContent } from "@/lib/supabase/types";
import { getMediaPreview, type IgPreview } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/content?page=&limit=&types=&statuses=&q= — daftar ringan utk /content.
// Filter + sort global + pagination dikerjakan di sini (BE); browser terima
// 1 halaman jadi (items + total + thumbs + previews). GET: user login (baca).

// Urutan grup: draft → stok → scheduled → published, terbaru dulu per grup.
const RANK: Record<string, number> = { draft: 0, idea: 1, scheduled: 2, published: 3 };

// Karakter spesial pola LIKE + koma (pemisah or()) dibersihkan dari keyword.
function escLike(s: string) {
  return s.replace(/,/g, " ").replace(/[\\%_]/g, (m) => `\\${m}`);
}

// Status arsip IG di-cache 5 mnt (id IG → arsip?): scan tiap halaman
// tetap murah setelah request pertama. URL preview TIDAK di-cache
// (cepat kedaluwarsa) — selalu fetch fresh utk item yg tampil.
// ponytail: full scan per request, pindah ke flag DB/cursor bila 1000+ konten.
const archiveCache = new Map<string, { archived: boolean; exp: number }>();

function checkArchived(igId: string, fresh: Map<string, IgPreview | null>): boolean {
  const hit = archiveCache.get(igId);
  if (hit && hit.exp > Date.now()) return hit.archived;
  if (archiveCache.size > 2000) archiveCache.clear();
  const archived = !fresh.get(igId);
  archiveCache.set(igId, { archived, exp: Date.now() + 5 * 60 * 1000 });
  return archived;
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
    .select("id,status,scheduled_date,scheduled_time,ig_media_id")
    .or("post_role.eq.owner,post_role.is.null");
  if (types.length > 0) idq = idq.in("type", types);
  if (statuses.length > 0) idq = idq.in("status", statuses);
  if (q) {
    const p = `%${escLike(q)}%`;
    idq = idq.or(`title.ilike.${p},caption.ilike.${p},pic_name.ilike.${p}`);
  }
  const { data: idRows, error: idErr } = await idq;
  if (idErr) return NextResponse.json({ error: idErr.message }, { status: 500 });
  type IdRow = { id: string; status: string; scheduled_date: string | null; scheduled_time: string | null; ig_media_id: string | null };
  const sorted = ((idRows ?? []) as IdRow[]).sort(
    (a, b) =>
      (RANK[a.status] ?? 99) - (RANK[b.status] ?? 99) ||
      (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? "") ||
      (b.scheduled_time ?? "").localeCompare(a.scheduled_time ?? "")
  );

  // 2. Visibilitas dulu (arsip IG disembunyikan), baru potong halaman —
  // total & halaman dihitung dari yg visible agar tiap halaman penuh.
  const fresh = new Map<string, IgPreview | null>();
  const visible = [...sorted];
  if (isInstagramConfigured()) {
    // Cek arsip per batch 20 (baik cache-hit maupun miss) agar tak
    // membanjiri Graph API saat kandidat banyak.
    const needCheck = (r: IdRow) => !!r.ig_media_id && !fresh.has(r.ig_media_id as string);
    for (let i = 0; i < sorted.length; i += 20) {
      await Promise.all(
        sorted.slice(i, i + 20).map((r) => {
          if (!needCheck(r)) return Promise.resolve();
          const igId = r.ig_media_id as string;
          const hit = archiveCache.get(igId);
          if (hit && hit.exp > Date.now()) return Promise.resolve();
          return getMediaPreview(igId).then((p) => {
            fresh.set(igId, p);
          });
        })
      );
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const igId = visible[i].ig_media_id;
      if (igId && checkArchived(igId, fresh)) visible.splice(i, 1);
    }
  }
  const total = visible.length;
  const pageIds = (all ? visible : visible.slice((page - 1) * limit, page * limit)).map((r) => r.id);
  if (pageIds.length === 0) {
    return NextResponse.json({ items: [], total, thumbs: {}, previews: {} });
  }

  // 3. Baris penuh halaman ini (IN tak menjamin urutan → susun ulang).
  const { data: rows, error: rowErr } = await supabase.from("contents").select("*").in("id", pageIds);
  if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
  const byId = new Map(((rows ?? []) as DbContent[]).map((r) => [r.id, r]));
  const ordered = pageIds.map((id) => byId.get(id)).filter((r): r is DbContent => !!r);

  // 4. Sweep jadwal terlewat (konsisten dgn listContents) — best effort.
  try {
    await sweepSupabase(supabase, ordered.filter((r) => r.status === "scheduled"));
  } catch {
    /* abaikan: tampil apa adanya */
  }

  // 5. Thumbnail Drive pertama tiap konten (join relasi).
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

  // 6. Preview IG fresh utk yg tampil (pakai hasil scan bila baru di-fetch).
  const previews: Record<string, IgPreview> = {};
  if (isInstagramConfigured()) {
    await Promise.all(
      ordered
        .filter((r) => r.ig_media_id)
        .map(async (r) => {
          const igId = r.ig_media_id as string;
          const p = fresh.get(igId) ?? (await getMediaPreview(igId));
          if (p) previews[igId] = p;
        })
    );
  }
  const items = ordered.map((r) => toItem(r));
  return NextResponse.json({ items, total, thumbs, previews });
}
