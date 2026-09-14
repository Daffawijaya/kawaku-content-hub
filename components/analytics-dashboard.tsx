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
import { TypeBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  analyticsDaily,
  categories,
  contentLibrary,
  contentMetrics,
  typeMeta,
  type ContentType,
} from "@/lib/mock";

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
        up ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
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
  const [fCat, setFCat] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [range, fType, fCat]);

  const cur = useMemo(() => analyticsDaily.slice(-range), [range]);
  const prev = useMemo(() => analyticsDaily.slice(-range * 2, -range), [range]);
  const s = useMemo(() => sum(cur), [cur]);
  const p = useMemo(() => sum(prev), [prev]);
  const er = s.reach > 0 ? (s.engagement / s.reach) * 100 : 0;
  const erPrev = p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;

  const inRange = (d: string) => cur.length > 0 && d >= cur[0].date && d <= cur[cur.length - 1].date;
  const matchTC = (t: ContentType, c: string) =>
    (fType === "all" || t === fType) && (fCat === "all" || c === fCat);

  const published = useMemo(
    () =>
      contentLibrary.filter(
        (c) => c.status === "published" && inRange(c.scheduledDate) && matchTC(c.type, c.category)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cur, fType, fCat]
  );
  const publishedPrev = useMemo(
    () =>
      contentLibrary.filter((c) => {
        if (c.status !== "published" || !matchTC(c.type, c.category) || prev.length === 0)
          return false;
        return c.scheduledDate >= prev[0].date && c.scheduledDate <= prev[prev.length - 1].date;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prev, fType, fCat]
  );

  // Komparasi tetap: minggu & bulan berjalan vs periode sebelumnya
  const week = useMemo(() => {
    const a = sum(analyticsDaily.slice(-7));
    const b = sum(analyticsDaily.slice(-14, -7));
    return { a, b };
  }, []);
  const month = useMemo(() => {
    const a = analyticsDaily.filter((d) => d.date >= "2026-09-01" && d.date <= "2026-09-14");
    const b = analyticsDaily.filter((d) => d.date >= "2026-08-18" && d.date <= "2026-08-31");
    return { a: sum(a), b: sum(b) };
  }, []);

  // Published per minggu (8 minggu terakhir, dari library + filter)
  const weekly = useMemo(() => {
    const end = new Date(2026, 8, 14);
    const buckets: { label: string; count: number }[] = [];
    const mon = mondayOfISO(end);
    for (let i = 7; i >= 0; i--) {
      const start = new Date(mon);
      start.setDate(start.getDate() - i * 7);
      const finish = new Date(start);
      finish.setDate(finish.getDate() + 7);
      const iso = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = contentLibrary.filter(
        (c) =>
          c.status === "published" &&
          c.scheduledDate >= iso(start) &&
          c.scheduledDate < iso(finish) &&
          matchTC(c.type, c.category)
      ).length;
      buckets.push({
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        count,
      });
    }
    return buckets;
  }, [fType, fCat]);

  const top = useMemo(
    () =>
      published
        .map((c) => ({ c, m: contentMetrics[c.id] }))
        .filter((x) => x.m)
        .sort((a, b) => b.m.reach - a.m.reach),
    [published]
  );

  const likes = Math.round(s.engagement * 0.58);
  const comments = Math.round(s.engagement * 0.045);
  const shares = Math.round(s.engagement * 0.075);
  const saves = Math.round(s.engagement * 0.09);
  const views = Math.round(s.reach * 1.95);

  const kpis = [
    { label: "Total Published", value: String(published.length), delta: deltaPct(published.length, publishedPrev.length) },
    { label: "Total Reach", value: fmtNum(s.reach), delta: deltaPct(s.reach, p.reach) },
    { label: "Impressions", value: fmtNum(s.impressions), delta: deltaPct(s.impressions, p.impressions) },
    { label: "Engagement Rate", value: `${er.toFixed(1)}%`, delta: er - erPrev, suffix: " pts" },
    { label: "Likes", value: fmtNum(likes), delta: deltaPct(s.engagement, p.engagement) },
    { label: "Comments", value: fmtNum(comments), delta: deltaPct(s.engagement, p.engagement) },
    { label: "Shares", value: fmtNum(shares), delta: deltaPct(s.engagement, p.engagement) },
    { label: "Saves", value: fmtNum(saves), delta: deltaPct(s.engagement, p.engagement) },
    { label: "Views", value: fmtNum(views), delta: deltaPct(s.reach, p.reach) },
  ];

  const maxReach = Math.max(...cur.map((d) => d.reach), 1);
  const maxEng = Math.max(...cur.map((d) => d.engagement), 1);
  const maxWeek = Math.max(...weekly.map((w) => w.count), 1);
  const W = 600;
  const H = 180;
  const PAD = 8;
  const pts = cur.map((d, i) => ({
    x: PAD + (i / Math.max(cur.length - 1, 1)) * (W - PAD * 2),
    y: H - PAD - (d.reach / maxReach) * (H - PAD * 2),
  }));
  const line = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

  const hasFilter = fType !== "all" || fCat !== "all";
  const skeleton = "animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800";

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
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFCat("all")} className={pill(fCat === "all")}>All categories</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setFCat(fCat === c ? "all" : c)} className={pill(fCat === c)}>
              {c}
            </button>
          ))}
        </div>
        {hasFilter && (
          <button
            onClick={() => {
              setFType("all");
              setFCat("all");
            }}
            className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Reset
          </button>
        )}
      </div>

      {/* KPI */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => <div key={i} className={cn(skeleton, "h-24")} />)
          : kpis.map((k) => (
              <Card key={k.label} className="p-4">
                <p className="text-xs font-medium text-zinc-500">{k.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{k.value}</p>
                <div className="mt-1">
                  <Delta value={k.delta} suffix={k.suffix} />
                </div>
              </Card>
            ))}
      </section>

      {/* Comparison */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { title: "This week vs previous week", a: week.a, b: week.b },
          { title: "Sep 1–14 vs Aug 18–31", a: month.a, b: month.b },
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
            <span className="text-xs text-zinc-500">{cur.length} hari terakhir</span>
          </CardHeader>
          <div className="px-5 pb-5">
            {loading ? (
              <div className={cn(skeleton, "h-44")} />
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Reach over time">
                {[0.25, 0.5, 0.75, 1].map((f) => (
                  <line
                    key={f}
                    x1={PAD}
                    x2={W - PAD}
                    y1={H - PAD - f * (H - PAD * 2)}
                    y2={H - PAD - f * (H - PAD * 2)}
                    className="stroke-zinc-200 dark:stroke-zinc-800"
                    strokeWidth={1}
                  />
                ))}
                <path d={`${line} L${(W - PAD).toFixed(1)},${(H - PAD).toFixed(1)} L${PAD},${(H - PAD).toFixed(1)} Z`} className="fill-emerald-500/15" />
                <path d={line} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" />
                {pts.map((pt, i) => (
                  <circle key={i} cx={pt.x} cy={pt.y} r={2.5} className="fill-emerald-600">
                    <title>{`${cur[i].date}: ${fmtNum(cur[i].reach)} reach`}</title>
                  </circle>
                ))}
                {[0, Math.floor(cur.length / 3), Math.floor((cur.length * 2) / 3), cur.length - 1]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((i) => (
                    <text key={i} x={pts[i].x} y={H - 1} textAnchor="middle" className="fill-zinc-400" fontSize={10}>
                      {fmtDateShort(cur[i].date)}
                    </text>
                  ))}
              </svg>
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
                    className="flex-1 rounded-sm bg-emerald-500/80 hover:bg-emerald-600"
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
          <span className="text-xs text-zinc-500">by reach • {range} hari terakhir</span>
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
                  const eng = m.likes + m.comments + m.shares + m.saves;
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
                      <td className="px-3 py-3 text-right font-medium">{fmtNum(m.reach)}</td>
                      <td className="px-3 py-3 text-right text-zinc-500">
                        {fmtNum(eng)} ({((eng / m.reach) * 100).toFixed(1)}%)
                      </td>
                      <td className="px-5 py-3 text-right text-zinc-500">{fmtNum(m.views)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
