import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { getAccountTotals, getFollowerCount, getFollowerDaily } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/instagram/account?range=7|30|365|all — totals akun cur vs prev.
// All = 365 hari (batas praktis Insights day-period).
// Semua metrik yg bisa diambil dari IG User Insights (Facebook Login):
// views, reach, likes, comments, shares, saves, replies, reposts,
// accounts_engaged, total_interactions, follows_and_unfollows,
// profile_views, website_clicks, profile_links_taps.
export async function GET(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const raw = new URL(req.url).searchParams.get("range");
  const days = raw === "all" || raw === "365" ? 365 : raw === "7" || raw === "30" ? Number(raw) : 30;
  const now = Math.floor(Date.now() / 1000);
  const curSince = now - days * 24 * 3600;
  const prevSince = now - days * 2 * 24 * 3600;
  try {
    const [cur, prev, followers, profileCount] = await Promise.all([
      getAccountTotals(curSince, now),
      getAccountTotals(prevSince, curSince),
      getFollowerDaily(prevSince, now).catch(() => [] as { date: string; followers: number }[]),
      getFollowerCount(),
    ]);
    // followers_now: field profil dulu (paling andal), fallback time_series.
    const tsLast = followers.length > 0 ? followers[followers.length - 1].followers : 0;
    const followers_now = profileCount || tsLast;
    const at = (iso: string) => followers.find((f) => f.date >= iso)?.followers ?? 0;
    const dstr = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
    const growth_cur = followers.length > 1 ? followers_now - at(dstr(curSince)) : 0;
    return NextResponse.json({ ok: true, range: days, cur, prev, followers_now, growth_cur });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal memuat account insights." },
      { status: 500 }
    );
  }
}
