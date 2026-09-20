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
  throw new Error("Unggah video IG timeout (>50 dtk) — coba posting ulang.");
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

// ---- Baca (sync polling) ----

export async function listRecentMedia(input: { since?: number; limit?: number } = {}): Promise<IgRecentMedia[]> {
  const json = await graph<{ data?: IgRecentMedia[] }>(`/${IG_USER_ID}/media`, {
    fields: "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count",
    limit: String(Math.min(input.limit ?? 50, 100)),
    since: input.since !== undefined ? String(input.since) : undefined,
  });
  return json.data ?? [];
}

// Postingan tempat akun ini hanya kolaborator (bukan pemilik).
// Hanya Feed image/Reels/Carousel — Stories tidak didukung Meta.
export type IgCollabMedia = {
  id: string;
  caption?: string;
  media_type?: IgMediaType;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string; // username pemilik asli postingan
  thumbnail_url?: string;
  total_like_count?: number;
  total_comments_count?: number;
};

export async function listCollaborativeMedia(input: { limit?: number } = {}): Promise<IgCollabMedia[]> {
  // Paginasi penuh via paging.next — 1 halaman cuma 50 item, kolab lama
  // (Juli/Agu) hilang kalau cuma ambil halaman pertama.
  const max = Math.min(input.limit ?? 200, 500);
  const out: IgCollabMedia[] = [];
  type CollabPage = { data?: IgCollabMedia[]; paging?: { next?: string } };
  let url: string | null = `/${IG_USER_ID}/collaborative_media`;
  let params: Record<string, string | undefined> = {
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username,total_like_count,total_comments_count",
    limit: "100",
  };
  while (url && out.length < max) {
    // paging.next = URL absolut (sudah mengandung access_token) → fetch langsung,
    // jangan lewat graph() yang menambah host/versi lagi.
    const json: CollabPage = url.startsWith("http")
      ? ((await fetch(url).then((r) => r.json())) as CollabPage)
      : await graph<CollabPage>(url, params);
    out.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
    params = {};
  }
  return out.slice(0, max);
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

// Reach harian akun (time_series real, 1 angka per hari).
export async function getAccountReachDaily(sinceUnix: number, untilUnix: number): Promise<{ date: string; reach: number }[]> {
  const json = await graph<{ data?: { values?: { value?: number; end_time?: string }[] }[] }>(
    `/${IG_USER_ID}/insights`,
    {
      metric: "reach",
      metric_type: "time_series",
      period: "day",
      since: String(sinceUnix),
      until: String(untilUnix),
    }
  );
  return (json.data?.[0]?.values ?? []).map((v) => ({
    date: (v.end_time ?? "").slice(0, 10),
    reach: v.value ?? 0,
  })).filter((r) => r.date);
}

export type AccountTotals = {
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  replies: number;
  reposts: number;
  accounts_engaged: number;
  total_interactions: number;
  follows_and_unfollows: number;
  profile_views: number;
  website_clicks: number;
  profile_links_taps: number;
};

const ACCOUNT_METRICS = [
  "views",
  "reach",
  "likes",
  "comments",
  "shares",
  "saves",
  "replies",
  "reposts",
  "accounts_engaged",
  "total_interactions",
  "follows_and_unfollows",
  "profile_views",
] as const;

// Satu metrik, gagal = 0 (akun <100 followers / metrik deprecated / belum ada data).
// follows_and_unfollows hanya keluar via breakdown follow_type — parse breakdown-nya.
type TotalValueNode = {
  value?: number;
  breakdowns?: { dimension_values?: string[]; value?: number }[];
};
async function getOneAccountMetric(name: string, sinceUnix: number, untilUnix: number): Promise<number> {
  const parse = (node?: { total_value?: TotalValueNode }): number => {
    const tv = node?.total_value;
    if (!tv) return 0;
    if (name === "follows_and_unfollows" && tv.breakdowns?.length) {
      const follows = tv.breakdowns.find((b) => b.dimension_values?.includes("FOLLOWER"))?.value ?? 0;
      const unfollows = tv.breakdowns.find((b) => b.dimension_values?.includes("UNFOLLOWER"))?.value ?? 0;
      // Net growth; bila API hanya mengembalikan follows, pakai itu.
      return follows - unfollows || follows;
    }
    if (typeof tv.value === "number") return tv.value;
    // Fallback generik: jumlahkan breakdown bila value tak ada.
    if (tv.breakdowns?.length) return tv.breakdowns.reduce((a, b) => a + (b.value ?? 0), 0);
    return 0;
  };
  try {
    const params: Record<string, string | undefined> = {
      metric: name,
      metric_type: "total_value",
      period: "day",
      since: String(sinceUnix),
      until: String(untilUnix),
      breakdown: name === "follows_and_unfollows" ? "follow_type" : undefined,
    };
    const json = await graph<{ data?: { name?: string; total_value?: TotalValueNode }[] }>(
      `/${IG_USER_ID}/insights`,
      params
    );
    const v = parse(json.data?.find((d) => d.name === name));
    if (v !== 0) return v;
  } catch {
    /* coba tanpa breakdown di bawah */
  }
  // Retry tanpa breakdown (beberapa akun/versi hanya merespons tanpa param itu).
  if (name === "follows_and_unfollows") {
    try {
      const json = await graph<{ data?: { name?: string; total_value?: TotalValueNode }[] }>(
        `/${IG_USER_ID}/insights`,
        {
          metric: name,
          metric_type: "total_value",
          period: "day",
          since: String(sinceUnix),
          until: String(untilUnix),
        }
      );
      return parse(json.data?.find((d) => d.name === name));
    } catch {
      return 0;
    }
  }
  return 0;
}

// Net follower growth dari follower_count time_series (last - first).
// Fallback bila follows_and_unfollows kosong (akun kecil / breakdown tak didukung).
export async function getFollowerGrowth(sinceUnix: number, untilUnix: number): Promise<number> {
  try {
    const rows = await getFollowerDaily(sinceUnix, untilUnix);
    if (rows.length < 2) return 0;
    return (rows[rows.length - 1].followers ?? 0) - (rows[0].followers ?? 0);
  } catch {
    return 0;
  }
}

// Total agregat akun utk 1 jendela waktu (cur vs prev utk delta).
// Batch dulu (1 request), yg hilang di-retry satuan agar 1 metrik
// invalid/deprecated tak menggagalkan semua.
export async function getAccountTotals(sinceUnix: number, untilUnix: number): Promise<AccountTotals> {
  const out: Record<string, number> = {};
  type BatchNode = { name?: string; total_value?: TotalValueNode };
  const parseBatch = (node: BatchNode | undefined, name: string): number => {
    const tv = node?.total_value;
    if (!tv) return 0;
    if (name === "follows_and_unfollows" && tv.breakdowns?.length) {
      const follows = tv.breakdowns.find((b) => b.dimension_values?.includes("FOLLOWER"))?.value ?? 0;
      const unfollows = tv.breakdowns.find((b) => b.dimension_values?.includes("UNFOLLOWER"))?.value ?? 0;
      return follows - unfollows || follows;
    }
    if (typeof tv.value === "number") return tv.value;
    if (tv.breakdowns?.length) return tv.breakdowns.reduce((a, b) => a + (b.value ?? 0), 0);
    return 0;
  };
  try {
    const json = await graph<{ data?: BatchNode[] }>(
      `/${IG_USER_ID}/insights`,
      {
        metric: ACCOUNT_METRICS.join(","),
        metric_type: "total_value",
        period: "day",
        since: String(sinceUnix),
        until: String(untilUnix),
      }
    );
    for (const m of ACCOUNT_METRICS) {
      out[m] = parseBatch(json.data?.find((d) => d.name === m), m);
    }
    const missing = ACCOUNT_METRICS.filter(
      (m) => !(json.data ?? []).some((d) => d.name === m) || (m === "follows_and_unfollows" && !out[m])
    );
    if (missing.length > 0 && missing.length < ACCOUNT_METRICS.length + 1) {
      await Promise.all(
        missing.map(async (m) => {
          const v = await getOneAccountMetric(m, sinceUnix, untilUnix);
          if (v !== 0 || out[m] === 0) out[m] = v;
        })
      );
    }
  } catch {
    await Promise.all(
      ACCOUNT_METRICS.map(async (m) => {
        out[m] = await getOneAccountMetric(m, sinceUnix, untilUnix);
      })
    );
  }
  // follows_and_unfollows sering 0 padahal followers nambah (breakdown tak
  // didukung / akun kecil) — fallback ke selisih follower_count time_series.
  if (!out.follows_and_unfollows) {
    const g = await getFollowerGrowth(sinceUnix, untilUnix);
    if (g !== 0) out.follows_and_unfollows = g;
  }
  const get = (name: (typeof ACCOUNT_METRICS)[number]) => out[name] ?? 0;
  return {
    views: get("views"),
    reach: get("reach"),
    likes: get("likes"),
    comments: get("comments"),
    shares: get("shares"),
    saves: get("saves"),
    replies: get("replies"),
    reposts: get("reposts"),
    accounts_engaged: get("accounts_engaged"),
    total_interactions: get("total_interactions"),
    follows_and_unfollows: get("follows_and_unfollows"),
    profile_views: get("profile_views"),
    // website_clicks / profile_links_taps deprecated Jan 2025 — selalu 0, tak di-fetch.
    website_clicks: 0,
    profile_links_taps: 0,
  };
}

// Followers harian (satu-satunya metrik stok yg punya time_series).
// Jumlah followers saat ini dari field profil (tanpa butuh permission
// insights — selalu ada selama token valid).
export async function getFollowerCount(): Promise<number> {
  try {
    const json = await graph<{ followers_count?: number }>(`/${IG_USER_ID}`, {
      fields: "followers_count",
    });
    return json.followers_count ?? 0;
  } catch {
    return 0;
  }
}export async function getFollowerDaily(sinceUnix: number, untilUnix: number): Promise<{ date: string; followers: number }[]> {
  const json = await graph<{ data?: { values?: { value?: number; end_time?: string }[] }[] }>(
    `/${IG_USER_ID}/insights`,
    {
      metric: "follower_count",
      metric_type: "time_series",
      period: "day",
      since: String(sinceUnix),
      until: String(untilUnix),
    }
  );
  return (json.data?.[0]?.values ?? []).map((v) => ({
    date: (v.end_time ?? "").slice(0, 10),
    followers: v.value ?? 0,
  })).filter((r) => r.date);
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
  follows: number;
  reposts: number;
  profile_visits: number;
  total_interactions: number;
};

// Metrik real per postingan; null bila tak tersedia (mis. story kadaluarsa).
// "views" hanya valid utk video — foto dicoba ulang tanpa views.
export async function getMediaInsights(mediaId: string): Promise<IgInsights | null> {
  const sets = [
    "reach,likes,comments,shares,saved,views,follows,reposts,total_interactions",
    "reach,likes,comments,shares,saved,views",
    "reach,likes,comments,shares,saved",
    "likes,comments",
  ];
  for (const metric of sets) {
    try {
      const json = await graph<{ data?: { name?: string; values?: { value?: number }[] }[] }>(
        `/${mediaId}/insights`,
        { metric }
      );
      const get = (name: string) =>
        json.data?.find((d) => d.name === name)?.values?.[0]?.value ?? 0;
      // profile_visits vs profile_views beda versi API — baca keduanya.
      const profileVisits = get("profile_visits") || get("profile_views");
      return {
        reach: get("reach"),
        likes: get("likes"),
        comments: get("comments"),
        shares: get("shares"),
        saves: get("saved"),
        views: get("views"),
        follows: get("follows"),
        reposts: get("reposts"),
        profile_visits: profileVisits,
        total_interactions: get("total_interactions") || get("likes") + get("comments") + get("shares") + get("saved"),
      };
    } catch {
      /* coba set metrik yg lebih kecil */
    }
  }
  return null;
}

export type IgComment = {
  id: string;
  text: string;
  username: string;
  timestamp?: string;
  likeCount?: number;
  replies?: IgComment[];
};

// Komentar asli IG per postingan (maks 50 teratas + balasan). Butuh permission
// instagram_manage_comments (+ pages_read_engagement) — tanpa itu throw jelas.
export async function getMediaComments(mediaId: string): Promise<IgComment[]> {
  type Raw = {
    id: string;
    text?: string;
    username?: string;
    from?: { username?: string };
    timestamp?: string;
    like_count?: number;
    replies?: { data?: Raw[] } | Raw[];
  };
  const json = await graph<{ data?: Raw[] }>(`/${mediaId}/comments`, {
    fields: "id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}",
    limit: "50",
  });
  const mapOne = (c: Raw): IgComment => {
    const rep = Array.isArray(c.replies) ? c.replies : (c.replies?.data ?? []);
    return {
      id: c.id,
      text: c.text ?? "",
      username: c.username || c.from?.username || "pengguna_ig",
      timestamp: c.timestamp,
      likeCount: c.like_count,
      replies: rep.map(mapOne),
    };
  };
  return (json.data ?? []).map(mapOne);
}

// Posting komentar baru ke postingan sendiri — terkirim atas nama akun
// bisnis IG yg terhubung. Butuh permission yg sama dgn baca komentar.
export async function postMediaComment(mediaId: string, message: string): Promise<string> {
  const msg = message.trim().slice(0, 2200);
  if (!msg) throw new Error("Komentar kosong.");
  const json = await graph<{ id?: string }>(`/${mediaId}/comments`, { message: msg }, "POST");
  if (!json.id) throw new Error("Posting komentar gagal.");
  return json.id;
}

// Balas komentar tertentu (atas nama akun bisnis yg terhubung).
export async function postCommentReply(commentId: string, message: string): Promise<string> {
  const msg = message.trim().slice(0, 2200);
  if (!msg) throw new Error("Balasan kosong.");
  const json = await graph<{ id?: string }>(`/${commentId}/replies`, { message: msg }, "POST");
  if (!json.id) throw new Error("Posting balasan gagal.");
  return json.id;
}

export type IgPreview = { mediaUrl?: string; thumbUrl?: string; mediaType?: IgMediaType };

// Username akun IG sendiri (utk menandai komentar sendiri). Null bila gagal.
export async function getAccountUsername(): Promise<string | null> {
  try {
    const json = await graph<{ username?: string }>(`/${IG_USER_ID}`, { fields: "username" });
    return json.username ?? null;
  } catch {
    return null;
  }
}

// URL CDN + tipe media utk thumbnail (publis = fetch dari IG, bukan Drive).
// URL video IG cepat kedaluwarsa — thumbnail_url hampir selalu masih hidup,
// jadi ikut diambil sbg cadangan tampilan.
export async function getMediaPreview(mediaId: string): Promise<IgPreview | null> {
  try {
    const json = await graph<{
      media_url?: string;
      thumbnail_url?: string;
      media_type?: IgMediaType;
    }>(`/${mediaId}`, { fields: "media_url,thumbnail_url,media_type" });
    if (!json.media_url && !json.thumbnail_url) return null;
    return { mediaUrl: json.media_url, thumbUrl: json.thumbnail_url, mediaType: json.media_type };
  } catch {
    return null;
  }
}
