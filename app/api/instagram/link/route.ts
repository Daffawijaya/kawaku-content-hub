import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { getPermalink, listRecentMedia } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";
import { createClient } from "@/lib/supabase/server";

// GET: 50 postingan IG terbaru (caption ringkas + tanggal + link) utk picker "Hubungkan".
export async function GET() {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  try {
    const items = await listRecentMedia({ limit: 50 });
    return NextResponse.json({
      ok: true,
      items: items.map((m) => ({
        id: m.id,
        caption: (m.caption ?? "").slice(0, 80),
        media_type: m.media_type ?? null,
        permalink: m.permalink ?? null,
        timestamp: m.timestamp ?? null,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membaca media IG." },
      { status: 500 }
    );
  }
}

// POST { contentId, igMediaId | null }: hubungkan/putus tautan konten ↔ postingan IG.
// Menghubungkan mengisi permalink + menandai published; memutus mengosongkan keduanya.
export async function POST(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as {
    contentId?: unknown;
    igMediaId?: unknown;
  } | null;
  const contentId = typeof body?.contentId === "string" ? body.contentId : "";
  const igMediaId = body?.igMediaId === null ? null : typeof body?.igMediaId === "string" ? body.igMediaId : undefined;
  if (!contentId || igMediaId === undefined) {
    return NextResponse.json({ error: "contentId + igMediaId (atau null) wajib." }, { status: 400 });
  }
  const supabase = await createClient();
  if (igMediaId === null) {
    const { error: upError } = await supabase
      .from("contents")
      .update({ ig_media_id: null, published_url: null, ig_sync_error: null })
      .eq("id", contentId);
    if (upError) return NextResponse.json({ error: upError.message }, { status: 500 });
    return NextResponse.json({ ok: true, unlinked: true });
  }
  let permalink = "";
  try {
    permalink = await getPermalink(igMediaId);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Postingan IG tak terbaca." },
      { status: 400 }
    );
  }
  const { error: upError } = await supabase
    .from("contents")
    .update({ ig_media_id: igMediaId, published_url: permalink || null, status: "published", ig_sync_error: null })
    .eq("id", contentId);
  if (upError) return NextResponse.json({ error: upError.message }, { status: 500 });
  await supabase.from("content_status_history").insert({ content_id: contentId, status: "published" });
  return NextResponse.json({ ok: true, permalink });
}
