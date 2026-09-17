import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toItem } from "@/lib/content-db";
import type { DbContent } from "@/lib/supabase/types";
import {
  getMediaInsights,
  getMediaPreview,
  type IgInsights,
  type IgPreview,
} from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/analytics/top-content?range=&type=&sort=&page=&limit=
// Top Content published milik sendiri: filter + sort + pagination di sini
// (BE); browser terima 1 halaman jadi (items + total + previews).
// Sort metrik butuh insights IG → di-fetch server-side, maks 80 kandidat
// terbaru (sama seperti perilaku FE sebelumnya).

const TYPES = ["feed", "carousel", "reels"] as const;
const SORTS = ["reach", "engagement", "views", "newest"] as const;

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftISODate(d: Date, days: number) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + days);
  return toISODate(x);
}

function score(m: IgInsights, sort: string) {
  if (sort === "views") return m.views;
  if (sort === "engagement") return m.total_interactions;
  return m.reach;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const rangeRaw = sp.get("range") ?? "30";
  const range = rangeRaw === "all" ? "all" : Math.max(1, Number(rangeRaw) || 30);
  const type = sp.get("type") ?? "all";
  const sort = sp.get("sort") ?? "reach";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(20, Math.max(1, Number(sp.get("limit")) || 5));

  const today = toISODate(new Date());
  const from = range === "all" ? "" : shiftISODate(new Date(), 1 - (range as number));

  // 1. Kandidat published milik sendiri dalam rentang (terbaru dulu, maks 80).
  let q = supabase
    .from("contents")
    .select("*")
    .eq("status", "published")
    .or("post_role.eq.owner,post_role.is.null")
    .gte("scheduled_date", from)
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: false })
    .order("scheduled_time", { ascending: false })
    .limit(80);
  if (type !== "all" && (TYPES as readonly string[]).includes(type)) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as DbContent[];

  // 2. Insights + preview server-side; tanpa preview = arsip → sembunyikan.
  const validSort = (SORTS as readonly string[]).includes(sort) ? sort : "reach";
  const withMetrics: { row: DbContent; m?: IgInsights }[] = [];
  const previews: Record<string, IgPreview> = {};
  if (isInstagramConfigured()) {
    await Promise.all(
      rows.map(async (r) => {
        if (!r.ig_media_id) {
          withMetrics.push({ row: r });
          return;
        }
        const [m, p] = await Promise.all([getMediaInsights(r.ig_media_id), getMediaPreview(r.ig_media_id)]);
        if (!p) return; // arsip/dihapus di IG: satu pintu, sembunyikan
        previews[r.ig_media_id] = p;
        withMetrics.push({ row: r, m: m ?? undefined });
      })
    );
  } else {
    for (const r of rows) withMetrics.push({ row: r });
  }

  // 3. Sort performa (tanpa metrik = paling bawah), tiebreak terbaru.
  withMetrics.sort((a, b) => {
    if (validSort !== "newest") {
      const sa = a.m ? score(a.m, validSort) : -1;
      const sb = b.m ? score(b.m, validSort) : -1;
      if (sb !== sa) return sb - sa;
    }
    return (
      (b.row.scheduled_date ?? "").localeCompare(a.row.scheduled_date ?? "") ||
      (b.row.scheduled_time ?? "").localeCompare(a.row.scheduled_time ?? "")
    );
  });

  // 4. Pagination.
  const total = withMetrics.length;
  const slice = withMetrics.slice((page - 1) * limit, page * limit);
  const pagePreviews: Record<string, IgPreview> = {};
  for (const k of Object.keys(previews)) {
    if (slice.some((s) => s.row.ig_media_id === k)) pagePreviews[k] = previews[k];
  }
  return NextResponse.json({
    items: slice.map((s) => ({ c: toItem(s.row), m: s.m ?? null })),
    total,
    previews: pagePreviews,
    page,
    limit,
  });
}
