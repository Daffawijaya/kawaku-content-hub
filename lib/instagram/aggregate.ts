import type { SupabaseClient } from "@supabase/supabase-js";
import { getAccountReachDaily, getFollowerDaily, getMediaInsights, listRecentMedia } from "./client";
import { isInstagramConfigured } from "./config";

export type DailyAggregate = { date: string; reach: number; impressions: number; engagement: number; followers: number };

function witaDate(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" });
}

// Bangun ulang 30 hari analytics_daily dari data real:
// - reach: time_series akun (real per hari)
// - engagement: lifetime likes+comments+shares+saves per postingan, dibucket ke tgl posting
// - impressions: diisi views per postingan (metrik impressions pensiun di v22;
//   satu-satunya angka "times displayed" yg real).
export async function refreshDailyAnalytics(supabase: SupabaseClient): Promise<DailyAggregate[]> {
  if (!isInstagramConfigured()) throw new Error("Instagram belum dikonfigurasi.");
  const now = Date.now();
  const since = Math.floor(now / 1000) - 30 * 24 * 3600;
  const cutoff = new Date(now - 35 * 24 * 3600_000).toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" });
  const [reachRows, followerRows, media] = await Promise.all([
    getAccountReachDaily(since, Math.floor(now / 1000)),
    getFollowerDaily(since, Math.floor(now / 1000)).catch(() => [] as { date: string; followers: number }[]),
    listRecentMedia({ limit: 100 }),
  ]);

  const byDate = new Map<string, DailyAggregate>();
  for (const r of reachRows) {
    byDate.set(r.date, { date: r.date, reach: r.reach, impressions: 0, engagement: 0, followers: 0 });
  }
  for (const f of followerRows) {
    const cur = byDate.get(f.date) ?? { date: f.date, reach: 0, impressions: 0, engagement: 0, followers: 0 };
    cur.followers = f.followers;
    byDate.set(f.date, cur);
  }
  await Promise.all(
    media.map(async (m) => {
      const d = m.timestamp ? witaDate(m.timestamp) : "";
      // Abaikan postingan >35 hari (di luar jendela 30 hari + toleransi).
      if (!d || d < cutoff) return;
      const ins = await getMediaInsights(m.id);
      if (!ins) return;
      const cur = byDate.get(d) ?? { date: d, reach: 0, impressions: 0, engagement: 0, followers: 0 };
      cur.engagement += ins.likes + ins.comments + ins.shares + ins.saves;
      cur.impressions += ins.views;
      byDate.set(d, cur);
    })
  );

  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (rows.length > 0) {
    const { error } = await supabase.from("analytics_daily").upsert(rows, { onConflict: "date" });
    if (error) throw new Error(error.message);
  }
  return rows;
}
