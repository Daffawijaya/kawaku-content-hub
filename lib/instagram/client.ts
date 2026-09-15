import { IG_GRAPH_HOST, IG_USER_ID, igApiVersion, isInstagramConfigured } from "./config";
import { resolveToken } from "./token";

export type IgMediaType = "IMAGE" | "VIDEO" | "REELS" | "CAROUSEL_ALBUM" | "STORY";

export type IgRecentMedia = {
  id: string;
  caption?: string;
  media_type?: IgMediaType;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

export type IgPublishResult = { igMediaId: string; permalink: string };

function assertConfigured() {
  if (!isInstagramConfigured()) {
    throw new Error("Instagram belum dikonfigurasi (isi IG_USER_ID / IG_PAGE_ACCESS_TOKEN).");
  }
}

function graphErrorMessage(json: unknown, status: number): string {
  const err = (json as { error?: { message?: string; code?: number; error_subcode?: number } } | null)?.error;
  const detail = err?.message ?? `Instagram API gagal (HTTP ${status}).`;
  const code = err?.code !== undefined ? ` (code ${err.code})` : "";
  return `${detail}${code}`;
}

async function graph<T>(
  path: string,
  params: Record<string, string | undefined>,
  method: "GET" | "POST" | "DELETE" = "GET"
): Promise<T> {
  assertConfigured();
  const token = await resolveToken();
  const url = `${IG_GRAPH_HOST}/${igApiVersion()}${path}`;
  let res: Response;
  if (method === "GET" || method === "DELETE") {
    const qs = new URLSearchParams({ access_token: token });
    for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, v);
    res = await fetch(`${url}?${qs.toString()}`, { method });
  } else {
    const body = new URLSearchParams({ access_token: token });
    for (const [k, v] of Object.entries(params)) if (v !== undefined) body.set(k, v);
    res = await fetch(url, { method: "POST", body });
  }
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok || (json as { error?: unknown } | null)?.error) {
    throw new Error(graphErrorMessage(json, res.status));
  }
  return json as T;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- Publish (2 langkah: container → media_publish) ----

async function createPhotoContainer(imageUrl: string, caption: string): Promise<string> {
  const json = await graph<{ id: string }>(`/${IG_USER_ID}/media`, { image_url: imageUrl, caption }, "POST");
  return json.id;
}

async function createVideoContainer(input: {
  videoUrl: string;
  caption: string;
  mediaType?: "REELS" | "STORIES";
  coverUrl?: string;
  thumbOffsetMs?: number;
  shareToFeed?: boolean;
}): Promise<string> {
  const json = await graph<{ id: string }>(
    `/${IG_USER_ID}/media`,
    {
      media_type: input.mediaType ?? "REELS",
      video_url: input.videoUrl,
      caption: input.mediaType === "STORIES" ? undefined : input.caption,
      cover_url: input.coverUrl,
      thumb_offset: input.thumbOffsetMs !== undefined ? String(input.thumbOffsetMs) : undefined,
      share_to_feed: input.shareToFeed !== undefined ? String(input.shareToFeed) : undefined,
    },
    "POST"
  );
  return json.id;
}

async function containerStatus(containerId: string): Promise<string> {
  const json = await graph<{ status_code?: string }>(`/${containerId}`, { fields: "status_code" });
  return json.status_code ?? "UNKNOWN";
}

// Video diunggah asinkron — tunggu FINISHED sebelum publish (maks ~50 dtk).
async function waitVideoReady(containerId: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const s = await containerStatus(containerId);
    if (s === "FINISHED") return;
    if (s === "ERROR" || s === "EXPIRED") throw new Error(`Upload video IG gagal (status ${s}).`);
    await sleep(5000);
  }
  throw new Error("Upload video IG timeout (>50 dtk) — coba publish ulang.");
}

async function publishContainer(creationId: string): Promise<string> {
  const json = await graph<{ id: string }>(`/${IG_USER_ID}/media_publish`, { creation_id: creationId }, "POST");
  return json.id;
}

export async function getPermalink(mediaId: string): Promise<string> {
  const json = await graph<{ permalink?: string }>(`/${mediaId}`, { fields: "id,permalink" });
  return json.permalink ?? "";
}

export async function publishPhoto(input: { imageUrl: string; caption: string }): Promise<IgPublishResult> {
  const containerId = await createPhotoContainer(input.imageUrl, input.caption);
  const igMediaId = await publishContainer(containerId);
  return { igMediaId, permalink: await getPermalink(igMediaId) };
}

export async function publishVideo(input: {
  videoUrl: string;
  caption: string;
  coverUrl?: string;
}): Promise<IgPublishResult> {
  const containerId = await createVideoContainer({ videoUrl: input.videoUrl, caption: input.caption, coverUrl: input.coverUrl });
  await waitVideoReady(containerId);
  const igMediaId = await publishContainer(containerId);
  return { igMediaId, permalink: await getPermalink(igMediaId) };
}

export type CarouselItem = { imageUrl?: string; videoUrl?: string };

// Carousel 2–10 item (campur foto/video boleh). Caption hanya di parent.
export async function publishCarousel(items: CarouselItem[], caption: string): Promise<IgPublishResult> {
  const cleaned = items.filter((it) => it.imageUrl || it.videoUrl).slice(0, 10);
  if (cleaned.length < 2) throw new Error("Carousel butuh minimal 2 media.");
  const childIds: string[] = [];
  for (const it of cleaned) {
    if (it.imageUrl) {
      const json = await graph<{ id: string }>(
        `/${IG_USER_ID}/media`,
        { image_url: it.imageUrl, is_carousel_item: "true" },
        "POST"
      );
      childIds.push(json.id);
    } else {
      const json = await graph<{ id: string }>(
        `/${IG_USER_ID}/media`,
        { video_url: it.videoUrl, media_type: "REELS", is_carousel_item: "true" },
        "POST"
      );
      await waitVideoReady(json.id);
      childIds.push(json.id);
    }
  }
  const parent = await graph<{ id: string }>(
    `/${IG_USER_ID}/media`,
    { media_type: "CAROUSEL", children: childIds.join(","), caption },
    "POST"
  );
  const igMediaId = await publishContainer(parent.id);
  return { igMediaId, permalink: await getPermalink(igMediaId) };
}

// Story tanpa caption (akun Business).
export async function publishStory(input: { imageUrl?: string; videoUrl?: string }): Promise<IgPublishResult> {
  if (!input.imageUrl && !input.videoUrl) throw new Error("Story butuh 1 gambar atau video.");
  const containerId = input.imageUrl
    ? await graph<{ id: string }>(
        `/${IG_USER_ID}/media`,
        { media_type: "STORIES", image_url: input.imageUrl },
        "POST"
      ).then((r) => r.id)
    : await createVideoContainer({ videoUrl: input.videoUrl as string, caption: "", mediaType: "STORIES" });
  if (!input.imageUrl) await waitVideoReady(containerId);
  const igMediaId = await publishContainer(containerId);
  return { igMediaId, permalink: await getPermalink(igMediaId) };
}

// ---- Baca (sync polling) ----

export async function listRecentMedia(input: { since?: number; limit?: number } = {}): Promise<IgRecentMedia[]> {
  const json = await graph<{ data?: IgRecentMedia[] }>(`/${IG_USER_ID}/media`, {
    fields: "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
    limit: String(Math.min(input.limit ?? 50, 100)),
    since: input.since !== undefined ? String(input.since) : undefined,
  });
  return json.data ?? [];
}

// Kuota publish live — jangan hardcode angka 50 di kode.
export async function getPublishingQuota(): Promise<{ quota_total?: number; quota_usage?: number }> {
  const json = await graph<{ config?: { quota_total?: number }; quota_usage?: number } | { data?: { config?: { quota_total?: number }; quota_usage?: number }[] }>(
    `/${IG_USER_ID}/content_publishing_limit`,
    { fields: "config,quota_usage" }
  );
  const node = Array.isArray((json as { data?: unknown }).data)
    ? (json as { data: { config?: { quota_total?: number }; quota_usage?: number }[] }).data[0] ?? {}
    : (json as { config?: { quota_total?: number }; quota_usage?: number });
  return { quota_total: node.config?.quota_total, quota_usage: node.quota_usage };
}

// ---- Hapus (butuh permission instagram_manage_contents) ----

export async function deleteMedia(mediaId: string): Promise<void> {
  await graph<{ success?: boolean }>(`/${mediaId}`, {}, "DELETE");
}

// ---- Insights (butuh permission instagram_manage_insights) ----

export type IgInsights = {
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
};

// Metrik real per postingan; null bila tak tersedia (mis. story kadaluarsa).
export async function getMediaInsights(mediaId: string): Promise<IgInsights | null> {
  try {
    const json = await graph<{ data?: { name?: string; values?: { value?: number }[] }[] }>(
      `/${mediaId}/insights`,
      { metric: "reach,likes,comments,shares,saved,views" }
    );
    const get = (name: string) =>
      json.data?.find((d) => d.name === name)?.values?.[0]?.value ?? 0;
    return {
      reach: get("reach"),
      likes: get("likes"),
      comments: get("comments"),
      shares: get("shares"),
      saves: get("saved"),
      views: get("views"),
    };
  } catch {
    return null;
  }
}
