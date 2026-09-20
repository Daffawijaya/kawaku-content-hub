import { NextResponse } from "next/server";
import { isInstagramConfigured } from "@/lib/instagram/config";
import { getProfileHeader, listRecentMedia, type IgMediaType } from "@/lib/instagram/client";

// GET /api/instagram/profile-feed — header profil + 6 media terbaru utk
// mockup HP di landing publik. Cache 1 jam (URL CDN IG bisa kedaluwarsa).
// Selalu 200: gagal → fallback statis agar landing tak pernah rusak.
export const revalidate = 3600;

export type FeedTile = { src: string; type: IgMediaType; link: string };
export type ProfileFeed = {
  ok: boolean;
  username: string;
  name: string;
  biography: string;
  followers: number;
  following: number;
  posts: number;
  avatar: string;
  tiles: FeedTile[];
};

const FALLBACK: ProfileFeed = {
  ok: false,
  username: "kawaku.kukar",
  name: "UMKM KUKAR",
  biography: "Karya Wirausaha dan Ekonomi Kreatif Kutai Kartanegara\nEdukasi | Inspirasi | Info Seputar UMKM",
  followers: 1914,
  following: 361,
  posts: 260,
  avatar: "/kawaku-avatar.jpg",
  tiles: [],
};

export async function GET() {
  if (!isInstagramConfigured()) return NextResponse.json(FALLBACK);
  try {
    const [header, media] = await Promise.all([getProfileHeader(), listRecentMedia({ limit: 6 })]);
    if (!header && media.length === 0) return NextResponse.json(FALLBACK);
    const tiles: FeedTile[] = media
      .map((m) => ({
        // Video/reels: pakai thumbnail (media_url video cepat kedaluwarsa).
        src: m.media_type === "VIDEO" || m.media_type === "REELS" ? (m.thumbnail_url ?? m.media_url ?? "") : (m.media_url ?? ""),
        type: m.media_type ?? "IMAGE",
        link: m.permalink ?? "",
      }))
      .filter((t) => t.src);
    const feed: ProfileFeed = {
      ok: true,
      username: header?.username ?? "kawaku.kukar",
      name: header?.name ?? "UMKM KUKAR",
      biography: header?.biography || FALLBACK.biography,
      followers: header?.followersCount ?? 0,
      following: header?.followsCount ?? 0,
      posts: header?.mediaCount ?? 0,
      avatar: header?.profilePictureUrl || FALLBACK.avatar,
      tiles,
    };
    return NextResponse.json(feed);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
