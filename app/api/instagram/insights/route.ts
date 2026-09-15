import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import {
  getMediaInsights,
  getMediaPreview,
  listCollaborativeMedia,
  type IgCollabMedia,
} from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/instagram/insights?ids=a,b,c: metrik + preview real per postingan IG.
// Maks 20 id per panggilan; id yg gagal dilewati (tidak menggagalkan semua).
//
// Collab post BUTUH jalur khusus: node media collab (GET /<id>, /<id>/insights)
// ditolak Meta utk token ini (code 100, missing permissions) — hanya endpoint
// /collaborative_media yg diizinkan. Maka metrik & preview collab diambil dari
// listing tsby (total_like_count/total_comments_count/media_url), bukan node.
type IgInsightShape = NonNullable<Awaited<ReturnType<typeof getMediaInsights>>>;

export async function GET(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, metrics: {}, previews: {}, collabIds: [] });
  }

  // Satu panggilan listing collab utk seluruh batch (metrik di situ terbatas:
  // likes, comments, tipe, URL — reach/views collab memang tak disediakan Meta).
  let collabMedia: IgCollabMedia[] = [];
  try {
    collabMedia = await listCollaborativeMedia({ limit: 500 });
  } catch {
    /* listing gagal → collab diperlakukan tanpa metrik, barisnya tetap tampil */
  }
  const collabIds = new Set(collabMedia.map((m) => m.id));
  const collabById = new Map(collabMedia.map((m) => [m.id, m]));

  const metrics: Record<string, IgInsightShape> = {};
  const previews: Record<string, NonNullable<Awaited<ReturnType<typeof getMediaPreview>>>> = {};

  await Promise.all(
    ids.map(async (id) => {
      if (collabIds.has(id)) {
        const c = collabById.get(id);
        if (c) {
          metrics[id] = {
            reach: 0,
            views: 0,
            likes: c.total_like_count ?? 0,
            comments: c.total_comments_count ?? 0,
            shares: 0,
            saves: 0,
            follows: 0,
            reposts: 0,
            profile_visits: 0,
            total_interactions: (c.total_like_count ?? 0) + (c.total_comments_count ?? 0),
          };
          if (c.media_url || c.thumbnail_url) {
            previews[id] = {
              mediaUrl: c.media_url,
              thumbUrl: c.thumbnail_url,
              mediaType: c.media_type,
            };
          }
        }
        return;
      }
      const [m, p] = await Promise.all([getMediaInsights(id), getMediaPreview(id)]);
      if (m) metrics[id] = m;
      if (p) previews[id] = p;
    })
  );
  return NextResponse.json({ ok: true, metrics, previews, collabIds: [...collabIds] });
}
