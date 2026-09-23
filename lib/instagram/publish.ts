import type { SupabaseClient } from "@supabase/supabase-js";
import { directDownloadUrl, makeFilePublic } from "@/lib/drive/client";
import { trashOrphanAssets } from "@/lib/drive/cleanup";
import { isInstagramConfigured } from "./config";
import {
  formatCollaborators,
  formatUserTags,
  publishCarousel,
  publishPhoto,
  publishStory,
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
  ig_user_tags: string;
  ig_collaborators?: string | null;
  ig_location_id: string | null;
  ig_alt_text: string;
};

type TagOptions = { userTags: string[]; collaborators: string[]; locationId?: string; altText?: string };

function parseTags(raw: string): string[] {
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Satu-satunya jalan publish ke IG (dipakai route manual + cron).
// Sukses: row → published + permalink, lalu file Drive dibersihkan (hero
// published diambil dari link IG). Gagal: ig_sync_error terisi, status utuh,
// file Drive tak tersentuh.
export async function publishContentById(
  supabase: SupabaseClient,
  contentId: string,
  override: PublishOverrides = {}
): Promise<IgPublishResult & { driveWarnings: string[] }> {
  if (!isInstagramConfigured()) {
    throw new Error("Instagram belum dikonfigurasi.");
  }
  const { data: row, error: rowError } = await supabase
    .from("contents")
    .select("id,type,caption,hashtags,ig_media_id,published_url,ig_user_tags,ig_collaborators,ig_location_id,ig_alt_text")
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
  const tags: TagOptions = {
    userTags: parseTags(content.ig_user_tags),
    collaborators: parseTags(typeof content.ig_collaborators === "string" ? content.ig_collaborators : "[]"),
    locationId: content.ig_location_id?.trim() || undefined,
    altText: content.ig_alt_text?.trim() || undefined,
  };
  try {
    const media = await resolveMediaAssets(supabase, contentId, override);
    // Reels: sampul dari modal (aset image Drive) otomatis jadi cover_url.
    // Override manual tetap menang bila dikirim eksplisit.
    const effectiveCoverUrl =
      validUrl(override.coverUrl) ?? (content.type === "reels" ? media.images[0] : undefined);
    const result = await publishByType(content.type, caption, media, effectiveCoverUrl, tags);
    await supabase
      .from("contents")
      .update({
        ig_media_id: result.igMediaId,
        published_url: result.permalink || null,
        status: "published",
        ig_sync_error: null,
      })
      .eq("id", contentId);
    await supabase.from("content_status_history").insert({ content_id: contentId, status: "published" });
    // Publish dipastikan sukses dulu (baris di atas throw bila gagal) baru
    // file Drive dibersihkan: lepas relasi + trash aset yatim (best-effort,
    // aset yg masih dipakai konten lain dilewati otomatis).
    let driveWarnings: string[] = [];
    try {
      const { data: rel } = await supabase.from("content_media").select("media_id").eq("content_id", contentId);
      const mediaIds = ((rel ?? []) as { media_id: string }[]).map((r) => r.media_id);
      if (mediaIds.length > 0) {
        await supabase.from("content_media").delete().eq("content_id", contentId);
        driveWarnings = await trashOrphanAssets(mediaIds);
      }
    } catch {
      /* arah aman: file tetap di Drive bila pembersihan gagal total */
    }
    return { ...result, driveWarnings };
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
  coverUrl?: string,
  tags: TagOptions = { userTags: [], collaborators: [] }
): Promise<IgPublishResult> {
  switch (type) {
    case "feed":
      return publishPhoto({
        imageUrl: need(media.images[0], "gambar"),
        caption,
        userTags: formatUserTags(tags.userTags, true),
        collaborators: formatCollaborators(tags.collaborators),
        locationId: tags.locationId,
        altText: tags.altText,
      });
    case "reels":
      return publishVideo({
        videoUrl: need(media.videos[0], "video"),
        caption,
        coverUrl,
        userTags: formatUserTags(tags.userTags, false),
        collaborators: formatCollaborators(tags.collaborators),
        locationId: tags.locationId,
      });
    case "carousel": {
      const items: CarouselItem[] = [
        ...media.images.map((imageUrl) => ({ imageUrl, altText: tags.altText })),
        ...media.videos.map((videoUrl) => ({ videoUrl })),
      ];
      if (items.length < 2) throw new Error("Carousel butuh minimal 2 media terhubung.");
      return publishCarousel(items, caption, {
        locationId: tags.locationId,
        userTags: tags.userTags,
        collaborators: formatCollaborators(tags.collaborators),
      });
    }
    case "story": {
      const imageUrl = media.images[0];
      const videoUrl = media.videos[0];
      if (!imageUrl && !videoUrl) throw new Error("Story butuh 1 gambar atau video terhubung.");
      // Caption + lokasi tidak dikirim ke IG (Stories API tak mendukungnya) —
      // judul/caption hanya tersimpan lokal sebagai nama tampilan.
      // Tag orang didukung story (username saja, tanpa koordinat).
      return publishStory({ imageUrl, videoUrl, userTags: formatUserTags(tags.userTags, false) });
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
