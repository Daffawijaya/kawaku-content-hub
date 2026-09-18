import type { SupabaseClient } from "@supabase/supabase-js";
import { directDownloadUrl, makeFilePublic } from "@/lib/drive/client";
import { isInstagramConfigured } from "./config";
import {
  publishCarousel,
  publishPhoto,
  publishVideo,
  type CarouselItem,
  type IgPublishResult,
} from "./client";

export type PublishOverrides = { imageUrl?: string; videoUrl?: string; coverUrl?: string };

type ContentRow = {
  id: string;
  type: string;
  caption: string;
  hashtags: string;
  ig_media_id: string | null;
  published_url: string | null;
};

// Satu-satunya jalan publish ke IG (dipakai route manual + cron).
// Sukses: row → published + permalink. Gagal: ig_sync_error terisi, status utuh.
export async function publishContentById(
  supabase: SupabaseClient,
  contentId: string,
  override: PublishOverrides = {}
): Promise<IgPublishResult> {
  if (!isInstagramConfigured()) {
    throw new Error("Instagram belum dikonfigurasi.");
  }
  const { data: row, error: rowError } = await supabase
    .from("contents")
    .select("id,type,caption,hashtags,ig_media_id,published_url")
    .eq("id", contentId)
    .single();
  if (rowError || !row) throw new Error("Konten tidak ditemukan.");
  const content = row as ContentRow;
  if (content.ig_media_id) {
    const err = new Error("Sudah terposting ke IG.") as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  const caption = [content.caption, content.hashtags].filter(Boolean).join("\n").slice(0, 2200);
  try {
    const media = await resolveMediaAssets(supabase, contentId, override);
    const result = await publishByType(content.type, caption, media, override.coverUrl);
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
    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Posting IG gagal.";
    await supabase.from("contents").update({ ig_sync_error: msg }).eq("id", contentId);
    throw e instanceof Error ? e : new Error(msg);
  }
}

async function publishByType(
  type: string,
  caption: string,
  media: { images: string[]; videos: string[] },
  coverUrl?: string
): Promise<IgPublishResult> {
  switch (type) {
    case "feed":
      return publishPhoto({ imageUrl: need(media.images[0], "gambar"), caption });
    case "reels":
      return publishVideo({ videoUrl: need(media.videos[0], "video"), caption, coverUrl });
    case "carousel": {
      const items: CarouselItem[] = [
        ...media.images.map((imageUrl) => ({ imageUrl })),
        ...media.videos.map((videoUrl) => ({ videoUrl })),
      ];
      if (items.length < 2) throw new Error("Carousel butuh minimal 2 media terhubung.");
      return publishCarousel(items, caption);
    }
    default:
      throw new Error(`Tipe ${type} tidak dikenal.`);
  }
}

// Override body menang; selebihnya aset Drive terhubung dijadikan publik dulu.
async function resolveMediaAssets(
  supabase: SupabaseClient,
  contentId: string,
  override: PublishOverrides
): Promise<{ images: string[]; videos: string[] }> {
  const images: string[] = [];
  const videos: string[] = [];
  const oi = validUrl(override.imageUrl);
  const ov = validUrl(override.videoUrl);
  if (oi) images.push(oi);
  if (ov) videos.push(ov);

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
      await makeFilePublic(fileId);
      const url = directDownloadUrl(fileId);
      if (a.kind === "image") images.push(url);
      else if (a.kind === "video") videos.push(url);
      if (images.length + videos.length >= 10) break;
    }
  }
  return { images, videos };
}

function need(v: string | undefined, kind: string): string {
  if (!v) {
    throw new Error(`Aset Drive ${kind} tidak ditemukan — hubungkan media di form edit atau kirim URL publik manual.`);
  }
  return v;
}

function validUrl(v: string | undefined): string | undefined {
  return v && /^https:\/\//.test(v) ? v : undefined;
}
