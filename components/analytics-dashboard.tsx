"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clapperboard,
  Images,
  LayoutGrid,
  Minus,
  Smartphone,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TypeBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  analyticsDaily as mockDaily,
  contentLibrary as mockLibrary,
  contentMetrics,
  typeMeta,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { listAnalyticsDaily, type DailyRow } from "@/lib/analytics-db";
import { listContents, usesSupabase } from "@/lib/content-db";
import type { IgInsights } from "@/lib/instagram/client";

const ranges = [
  { key: 7, label: "7D" },
  { key: 14, label: "14D" },
  { key: 28, label: "28D" },
] as const;

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
  story: Smartphone,
};

const pill = (active: boolean) =>
  active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800";

function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

function fmtDateShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function deltaPct(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

function Delta({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value === null)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-zinc-400">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-brand-700 dark:text-brand-400" : "text-rose-600 dark:text-rose-400"
      )}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

function sum(days: { reach: number; impressions: number; engagement: number }[]) {
  return days.reduce(
    (a, d) => ({
      reach: a.reach + d.reach,
      impressions: a.impressions + d.impressions,
      engagement: a.engagement + d.engagement,
    }),
    { reach: 0, impressions: 0, engagement: 0 }
  );
}

function mondayOfISO(date: Date) {
  const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState<7 | 14 | 28>(14);
  const [fType, setFType] = useState<"all" | ContentType>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>(mockDaily);
  const [contents, setContents] = useState<ManagedContent[]>(mockLibrary);
  // Mode Supabase: metrik live dari IG insights (key = ig_media_id).
  // Mode mock: pakai contentMetrics mock.
  const [liveMetrics, setLiveMetrics] = useState<Record<string, IgInsights>>({});

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    // Mock hanya utk mode tanpa Supabase; error Supabase tampil apa adanya.
    Promise.all([listAnalyticsDaily(), listContents().catch(() => mockLibrary)])
      .then(([d, c]) => {
        setDaily(d);
        setContents(c);
      })
      .catch((e: unknown) => {
        setDaily([]);
        setLoadError(e instanceof Error ? e.message : "Gagal memuat analytics.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Insights live utk konten yg terhubung IG (maks 20 id terbaru).
  useEffect(() => {
    if (!usesSupabase()) return;
    const ids = contents
      .filter((c) => c.status === "published" && c.igMediaId)
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
      .slice(0, 20)
      .map((c) => c.igMediaId as string);
    if (ids.length === 0) return;
    fetch(`/api/instagram/insights?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((json) => {
        const m = (json as { metrics?: Record<string, IgInsights> }).metrics;
        if (m) setLiveMetrics(m);
      })
      .catch(() => undefined);
  }, [contents]);

  const cur = useMemo(() => daily.slice(-range), [daily, range]);
  const prev = useMemo(() => daily.slice(-range * 2, -range), [daily, range]);
  const s = useMemo(() => sum(cur), [cur]);
  const p = useMemo(() => sum(prev), [prev]);
  const er = s.reach > 0 ? (s.engagement / s.reach) * 100 : 0;
  const erPrev = p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;

  const inRange = (d: string) => cur.length > 0 && d >= cur[0].date && d <= cur[cur.length - 1].date;
  const matchTC = (t: ContentType) => fType === "all" || t === fType;

  const published = useMemo(
    () =>
      contents.filter(
        (c) => c.status === "published" && inRange(c.scheduledDate) && matchTC(c.type)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contents, cur, fType]
  );
  const publishedPrev = useMemo(
    () =>
      contents.filter((c) => {
        if (c.status !== "published" || !matchTC(c.type) || prev.length === 0)
          return false;
        return c.scheduledDate >= prev[0].date && c.scheduledDate <= prev[prev.length - 1].date;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contents, prev, fType]
  );

  // Komparasi: minggu berjalan vs sebelumnya, bulan berjalan vs bulan lalu.
  const week = useMemo(() => {
    const a = sum(daily.slice(-7));
    const b = sum(daily.slice(-14, -7));
    return { a, b };
  }, [daily]);
  const month = useMemo(() => {
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevSame = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const a = daily.filter((d) => d.date >= iso(first) && d.date <= iso(now));
    const b = daily.filter((d) => d.date >= iso(prevFirst) && d.date <= iso(prevSame));
    const short = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return { a: sum(a), b: sum(b), label: `${short(first)}–${short(now)} vs ${short(prevFirst)}–${short(prevSame)}` };
  }, [daily]);

  // Published per minggu (8 minggu terakhir, dari data + filter)
  const weekly = useMemo(() => {
    const end = new Date();
    const buckets: { label: string; count: number }[] = [];
    const mon = mondayOfISO(end);
    for (let i = 7; i >= 0; i--) {
      const start = new Date(mon);
      start.setDate(start.getDate() - i * 7);
      const finish = new Date(start);
      finish.setDate(finish.getDate() + 7);
      const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = contents.filter(
        (c) =>
          c.status === "published" &&
          c.scheduledDate >= iso(start) &&
          c.scheduledDate < iso(finish) &&
          matchTC(c.type)
      ).length;
      buckets.push({
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        count,
      });
    }
    return buckets;
  }, [contents, fType]);

  // Terbit terbaru yang punya metrik; tanpa metrik tampil dengan strip.
  // Supabase: hanya insights live. Mock: contentMetrics mock.
  const top = useMemo(
    () =>
      published
        .map((c) => ({
          c,
          m: usesSupabase()
            ? c.igMediaId
              ? liveMetrics[c.igMediaId]
              : undefined
            : contentMetrics[c.id],
        }))
        .sort((a, b) =>
          b.c.scheduledDate.localeCompare(a.c.scheduledDate) ||
          b.c.scheduledTime.localeCompare(a.c.scheduledTime)
        ),
    [published, liveMetrics]
  );

  // KPI turunan engagement/reach (likes/comments/…) dihapus — dulu rasio
  // fixed (0.58/0.045/…) yg mengarang angka.
  const kpis = [
    { label: "Total Published", value: String(published.length), delta: deltaPct(published.length, publishedPrev.length) },
    { label: "Total Reach", value: fmtNum(s.reach), delta: deltaPct(s.reach, p.reach) },
    { label: "Impressions", value: fmtNum(s.impressions), delta: deltaPct(s.impressions, p.impressions) },
    { label: "Engagement Rate", value: `${er.toFixed(1)}%`, delta: er - erPrev, suffix: " pts" },
  ];

  const maxReach = Math.max(...cur.map((d) => d.reach), 1);
  const maxEng = Math.max(...cur.map((d) => d.engagement), 1);
  const maxWeek = Math.max(...weekly.map((w) => w.count), 1);
  // Gaya saham ala etamhub: hijau naik, merah turun (titik terakhir vs pertama).
  const trendUp = cur.length < 2 || cur[cur.length - 1].reach >= cur[0].reach;
  const trendColor = trendUp ? "#10B981" : "#EF4444";
  const trendDelta = cur.length < 2 ? null : deltaPct(cur[cur.length - 1].reach, cur[0].reach);
  const reachData = cur.map((d) => ({ month: fmtDateShort(d.date), reach: d.reach }));

  const hasFilter = fType !== "all";
  const skeleton = "animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800";
  // Grafik butuh minimal 1 baris harian; tanpa itu pts[-1] crash.
  const showData = !loading && !loadError && daily.length > 0;

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium",
                range === r.key
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFType("all")} className={pill(fType === "all")}>All types</button>
          {(Object.keys(typeMeta) as ContentType[]).map((t) => (
            <button key={t} onClick={() => setFType(fType === t ? "all" : t)} className={pill(fType === t)}>
              {typeMeta[t].label}
            </button>
          ))}
        </div>
        {hasFilter && (
          <button
            onClick={() => {
              setFType("all");
            }}
            className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            Reset
          </button>
        )}
      </div>

      {/* KPI */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={cn(skeleton, "h-24")} />)
          : loadError ? (
            <Card className="col-span-full p-4">
              <p className="text-sm font-medium">Gagal memuat dari Supabase</p>
              <p className="mt-1 text-xs text-zinc-500">{loadError}</p>
            </Card>
          ) : daily.length === 0 ? (
            <Card className="col-span-full p-4">
              <p className="text-sm font-medium">Belum ada data analytics</p>
              <p className="mt-1 text-xs text-zinc-500">
                Tabel analytics_daily kosong — isi via seed atau sinkronisasi sebelum grafik tampil.
              </p>
            </Card>
          ) : (
            kpis.map((k) => (
              <Card key={k.label} className="p-4">
                <p className="text-xs font-medium text-zinc-500">{k.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{k.value}</p>
                <div className="mt-1">
                  <Delta value={k.delta} suffix={k.suffix} />
                </div>
              </Card>
            ))
          )}
      </section>

      {/* Comparison */}
      {showData && (
      <>
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { title: "This week vs previous week", a: week.a, b: week.b },
          { title: month.label, a: month.a, b: month.b },
        ].map((c) => (
          <Card key={c.title} className="p-4">
            <p className="text-xs font-medium text-zinc-500">{c.title}</p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              <p className="text-sm">
                <span className="font-semibold">{fmtNum(c.a.reach)}</span>{" "}
                <span className="text-zinc-500">reach</span> <Delta value={deltaPct(c.a.reach, c.b.reach)} />
              </p>
              <p className="text-sm">
                <span className="font-semibold">{fmtNum(c.a.engagement)}</span>{" "}
                <span className="text-zinc-500">engagement</span>{" "}
                <Delta value={deltaPct(c.a.engagement, c.b.engagement)} />
              </p>
            </div>
          </Card>
        ))}
      </section>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reach over time</CardTitle>
            <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
              {cur.length} hari terakhir <Delta value={trendDelta} />
            </span>
          </CardHeader>
          <div className="px-5 pb-5">
            {loading ? (
              <div className={cn(skeleton, "h-44")} />
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={reachData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-white/5" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tickFormatter={(v: number) => fmtNum(v)}
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                      domain={[(dataMin: number) => Math.floor(dataMin * 0.9), (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                    />
                    <Tooltip
                      formatter={(value) => (value == null ? ["—", "Reach"] : [fmtNum(Number(value)), "Reach"])}
                      contentStyle={{
                        backgroundColor: "#1b1b1b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                        fontSize: "13px",
                      }}
                      labelStyle={{ color: "#94a3b8" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="reach"
                      stroke="none"
                      fill="url(#reachGradient)"
                      tooltipType="none"
                    />
                    <Line
                      type="monotone"
                      dataKey="reach"
                      stroke={trendColor}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, stroke: trendColor, strokeWidth: 2, fill: "#fff" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement over time</CardTitle>
          </CardHeader>
          <div className="px-5 pb-5">
            {loading ? (
              <div className={cn(skeleton, "h-36")} />
            ) : (
              <div className="flex h-36 items-end gap-1" role="img" aria-label="Engagement over time">
                {cur.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${fmtNum(d.engagement)}`}
                    className="flex-1 rounded-sm bg-brand-500/80 hover:bg-brand-600"
                    style={{ height: `${Math.max(4, (d.engagement / maxEng) * 100)}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Published per week</CardTitle>
            <span className="text-xs text-zinc-500">8 minggu terakhir</span>
          </CardHeader>
          <div className="px-5 pb-5">
            {loading ? (
              <div className={cn(skeleton, "h-36")} />
            ) : weekly.every((w) => w.count === 0) ? (
              <p className="flex h-36 items-center justify-center text-sm text-zinc-500">
                Belum ada konten published pada filter ini.
              </p>
            ) : (
              <div className="flex h-36 items-end gap-2" role="img" aria-label="Published per week">
                {weekly.map((w) => (
                  <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[11px] font-medium text-zinc-500">{w.count > 0 ? w.count : ""}</span>
                    <div
                      title={`Minggu ${w.label}: ${w.count}`}
                      className="w-full rounded-sm bg-sky-500/80 hover:bg-sky-600"
                      style={{ height: `${Math.max(4, (w.count / maxWeek) * 100)}%` }}
                    />
                    <span className="text-[10px] text-zinc-400">{w.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top content */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top Content</CardTitle>
          <span className="text-xs text-zinc-500">terbaru • {range} hari terakhir</span>
        </CardHeader>
        {top.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-zinc-500">
            Tidak ada konten published pada rentang & filter ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-y border-zinc-100 text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="px-5 py-2.5 font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">Content</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Published</th>
                  <th className="px-3 py-2.5 text-right font-medium">Reach</th>
                  <th className="px-3 py-2.5 text-right font-medium">Eng.</th>
                  <th className="px-5 py-2.5 text-right font-medium">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {top.map(({ c, m }, i) => {
                  const Icon = typeIcons[c.type];
                  const eng = m ? m.likes + m.comments + m.shares + m.saves : null;
                  return (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <td className="px-5 py-3 text-zinc-400">{i + 1}</td>
                      <td className="px-3 py-3">
                        <Link href={`/content/${c.id}`} className="flex items-center gap-2.5 hover:underline">
                          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br", c.tone)}>
                            <Icon className="h-4 w-4 text-zinc-500" />
                          </span>
                          <span className="font-medium">{c.title}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <TypeBadge type={c.type} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-500">
                        {fmtDateShort(c.scheduledDate)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">{m ? fmtNum(m.reach) : "—"}</td>
                      <td className="px-3 py-3 text-right text-zinc-500">
                        {eng === null || !m ? "—" : `${fmtNum(eng)} (${((eng / m.reach) * 100).toFixed(1)}%)`}
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-500">{m ? fmtNum(m.views) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </>
      )}
    </div>
  );
}
