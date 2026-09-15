import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { directDownloadUrl, makeFilePublic } from "@/lib/drive/client";
import { isInstagramConfigured } from "@/lib/instagram/config";
import { publishPhoto, publishVideo } from "@/lib/instagram/client";
import { createClient } from "@/lib/supabase/server";

// POST { contentId, imageUrl?, videoUrl?, coverUrl? }: publish konten ke IG.
// Fase 1: feed (foto) + reels (video). Carousel/story menyusul.
// URL diambil otomatis dari aset Drive terhubung (dijadikan publik dulu);
// override manual via body tetap bisa bila diperlukan.
export async function POST(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    contentId?: unknown;
    imageUrl?: unknown;
    videoUrl?: unknown;
    coverUrl?: unknown;
  } | null;
  const contentId = typeof body?.contentId === "string" ? body.contentId : "";
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl : undefined;
  const videoUrl = typeof body?.videoUrl === "string" ? body.videoUrl : undefined;
  const coverUrl = typeof body?.coverUrl === "string" ? body.coverUrl : undefined;
  if (!contentId) {
    return NextResponse.json({ error: "contentId wajib diisi." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: row, error: rowError } = await supabase
    .from("contents")
    .select("id,type,status,caption,hashtags,ig_media_id,published_url")
    .eq("id", contentId)
    .single();
  if (rowError || !row) {
    return NextResponse.json({ error: "Konten tidak ditemukan." }, { status: 404 });
  }
  const content = row as {
    id: string;
    type: string;
    caption: string;
    hashtags: string;
    ig_media_id: string | null;
    published_url: string | null;
  };
  if (content.ig_media_id) {
    return NextResponse.json(
      { error: "Sudah terpublish ke IG.", permalink: content.published_url },
      { status: 409 }
    );
  }

  const caption = [content.caption, content.hashtags].filter(Boolean).join("\n").slice(0, 2200);
  try {
    // Selesaikan tipe dulu sebelum sentuh Drive (hemat API call).
    if (content.type !== "feed" && content.type !== "reels") {
      return NextResponse.json(
        { error: `Tipe ${content.type} menyusul di Fase 2 (Fase 1: feed + reels).` },
        { status: 400 }
      );
    }
    const resolved = await resolveMediaUrls(supabase, contentId, { imageUrl, videoUrl });
    const result =
      content.type === "feed"
        ? await publishPhoto({ imageUrl: need(resolved.imageUrl, "gambar"), caption })
        : await publishVideo({ videoUrl: need(resolved.videoUrl, "video"), caption, coverUrl });
    await supabase
      .from("contents")
      .update({
        ig_media_id: result.igMediaId,
        published_url: result.permalink,
        status: "published",
        ig_sync_error: null,
      })
      .eq("id", contentId);
    await supabase.from("content_status_history").insert({ content_id: contentId, status: "published" });
    return NextResponse.json({ ok: true, igMediaId: result.igMediaId, permalink: result.permalink });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publish IG gagal.";
    await supabase.from("contents").update({ ig_sync_error: msg }).eq("id", contentId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// URL media: override body menang; selebihnya ambil aset Drive terhubung
// (gambar pertama utk feed, video pertama utk reels) lalu jadikan publik.
async function resolveMediaUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentId: string,
  override: { imageUrl?: string; videoUrl?: string }
): Promise<{ imageUrl?: string; videoUrl?: string }> {
  let imageUrl = validUrl(override.imageUrl);
  let videoUrl = validUrl(override.videoUrl);
  if (imageUrl && videoUrl) return { imageUrl, videoUrl };

  const { data: rel } = await supabase.from("content_media").select("media_id").eq("content_id", contentId);
  const mediaIds = ((rel ?? []) as { media_id: string }[]).map((r) => r.media_id);
  if (mediaIds.length > 0) {
    const { data: assets } = await supabase
      .from("media_assets")
      .select("kind,drive_file_id")
      .in("id", mediaIds);
    for (const a of ((assets ?? []) as { kind: string; drive_file_id: string }[])) {
      const fileId = a.drive_file_id;
      if (!fileId || fileId.startsWith("drive_mock_")) continue;
      if (a.kind === "image" && !imageUrl) {
        await makeFilePublic(fileId);
        imageUrl = directDownloadUrl(fileId);
      } else if (a.kind === "video" && !videoUrl) {
        await makeFilePublic(fileId);
        videoUrl = directDownloadUrl(fileId);
      }
      if (imageUrl && videoUrl) break;
    }
  }
  return { imageUrl, videoUrl };
}

function need(v: string | undefined, kind: string): string {
  if (!v) {
    throw new Error(
      `Aset Drive ${kind} tidak ditemukan — hubungkan media di form edit atau kirim URL publik manual.`
    );
  }
  return v;
}

function validUrl(v: string | undefined): string | undefined {
  return v && /^https:\/\//.test(v) ? v : undefined;
}
