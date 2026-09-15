"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
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
import type { AccountTotals, IgInsights, IgPreview } from "@/lib/instagram/client";

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
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

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
  // Flat (sama persis) = abu, naik = ijo, turun = merah.
  if (value === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-zinc-400">
        <Minus className="h-3 w-3" />0.0{suffix}
      </span>
    );
  const up = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
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
  const [previews, setPreviews] = useState<Record<string, IgPreview>>({});
  // Tertaut tapi tak terbaca IG (diarsip/dihapus) = sembunyi dari list.
  // Muncul lagi otomatis saat terbaca (buka arsip) di load berikutnya.
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  // Totals akun live dari IG User Insights (cur vs prev sesuai range).
  const [account, setAccount] = useState<{
    cur: AccountTotals;
    prev: AccountTotals;
    followers_now?: number;
    growth_cur?: number;
  } | null>(null);
  // Seluruh analitik lengkap (akun live, komparasi, grafik, filter) di balik expand.
  const [showFull, setShowFull] = useState(false);
  const fullBtnRef = useRef<HTMLButtonElement>(null);
  // Toggle expand + animasikan perubahan lebar tombol ala Apple (FLIP:
  // kunci lebar saat ini, tukar teks, ukur lebar natural target, animasikan).
  const toggleFull = () => {
    const el = fullBtnRef.current;
    if (!el) {
      setShowFull((v) => !v);
      return;
    }
    el.getAnimations().forEach((a) => a.cancel());
    el.style.width = "";
    const from = el.offsetWidth;
    el.style.width = `${from}px`; // kunci agar teks baru tak mengubah layout
    setShowFull((v) => !v);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // Ukur lebar natural label baru: lepas kunci + baca + kunci lagi
        // dalam satu task (tanpa paint di antaranya → tanpa kedip).
        // (scrollWidth tak bisa dipakai: ia mengembalikan lebar kunci.)
        el.style.width = "";
        const to = el.offsetWidth;
        el.style.width = `${from}px`;
        void el.offsetWidth; // paksa reflow agar kunci berlaku dulu
        if (to > 0 && to !== from) {
          const anim = el.animate([{ width: `${from}px` }, { width: `${to}px` }], {
            duration: 380,
            easing: "cubic-bezier(0.32, 0.72, 0, 1)",
          });
          anim.onfinish = () => {
            el.style.width = "";
          };
        } else {
          el.style.width = "";
        }
      })
    );
  };
  // Baris Top Content yg dibuka (satu per satu) utk rincian metrik.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Urutan Top Content: reach tertinggi dulu (bukan tanggal).
  const [topSort, setTopSort] = useState<"reach" | "engagement" | "views" | "newest">("reach");
  // Peran postingan: semua / milik sendiri (owner) / collab (diundang).
  const [fRole, setFRole] = useState<"all" | "owner" | "collaborator">("all");

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

  // Insights live utk konten yg terhubung IG dalam jendela cur+prev
  // (maks 40, di-chunk 20 mengikuti batas API) — agar tiap filter tipe
  // selalu punya metrik, bukan cuma 20 postingan terbaru.
  useEffect(() => {
    if (!usesSupabase()) return;
    const days = [...daily].sort((a, b) => a.date.localeCompare(b.date));
    const curWin = days.slice(-range);
    const prevWin = days.slice(-range * 2, -range);
    const from = prevWin[0]?.date ?? curWin[0]?.date;
    const to = curWin[curWin.length - 1]?.date;
    const ids = contents
      .filter(
        (c) =>
          c.status === "published" &&
          c.igMediaId &&
          (!from || !to || (c.scheduledDate >= from && c.scheduledDate <= to))
      )
      .sort(
        (a, b) =>
          b.scheduledDate.localeCompare(a.scheduledDate) ||
          b.scheduledTime.localeCompare(a.scheduledTime)
      )
      .slice(0, 40)
      .map((c) => c.igMediaId as string);
    if (ids.length === 0) return;
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 20) chunks.push(ids.slice(i, i + 20));
    Promise.all(
      chunks.map((ch) =>
        fetch(`/api/instagram/insights?ids=${ch.join(",")}`).then((r) => r.json())
      )
    )
      .then((all) => {
        const metrics: Record<string, IgInsights> = {};
        const previews: Record<string, IgPreview> = {};
        let ok = false;
        // Postingan collab: node media collab ditolak Meta (permission) — metrik &
        // preview-nya lewat listing /collaborative_media. Collab TIDAK boleh
        // dianggap "diarsip" walau node-nya tak terbaca.
        const seenCollab: string[] = [];
        for (const raw of all) {
          const j = raw as { ok?: boolean; metrics?: Record<string, IgInsights>; previews?: Record<string, IgPreview>; collabIds?: string[] };
          if (!j.ok) continue;
          ok = true;
          Object.assign(metrics, j.metrics ?? {});
          Object.assign(previews, j.previews ?? {});
          if (j.collabIds?.length) seenCollab.push(...j.collabIds);
        }
        if (!ok) return;
        setLiveMetrics(metrics);
        setPreviews(previews);
        // Hanya nilai bila request-nya sendiri sukses — kegagalan global
        // (token mati/jaringan) tidak boleh menyembunyikan semua baris.
        setArchivedIds(ids.filter((id) => !metrics[id] && !previews[id] && !seenCollab.includes(id)));
      })
      .catch(() => undefined);
  }, [contents, daily, range]);

  // Rule: Analytics = konten published = gambar dari IG saja.
  // Drive hanya utk stok (halaman content/detail), tidak di-fetch di sini.
  // Totals akun live mengikuti range yg dipilih (7/14/28 hari).
  useEffect(() => {
    if (!usesSupabase()) return;
    fetch(`/api/instagram/account?range=${range}`)
      .then((r) => r.json())
      .then((json) => {
        const j = json as { ok?: boolean; cur?: AccountTotals; prev?: AccountTotals; followers_now?: number; growth_cur?: number };
        if (j.ok && j.cur && j.prev) setAccount({ cur: j.cur, prev: j.prev, followers_now: j.followers_now, growth_cur: j.growth_cur });
      })
      .catch(() => undefined);
  }, [range]);

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
        (c) => c.status === "published" && inRange(c.scheduledDate)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contents, cur]
  );
  const publishedPrev = useMemo(
    () =>
      contents.filter((c) => {
        if (c.status !== "published" || prev.length === 0)
          return false;
        return c.scheduledDate >= prev[0].date && c.scheduledDate <= prev[prev.length - 1].date;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contents, prev]
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

  // Top Content: urut performa (tanpa metrik = paling bawah), tiebreak terbaru.
  const top = useMemo(
    () =>
      published
        .filter((c) => matchTC(c.type))
        .filter((c) => (c.postRole ?? "owner") === fRole || fRole === "all")
        .filter((c) => {
          // Collab tak pernah disembunyikan (node-nya memang tak terbaca IG).
          if (c.postRole === "collaborator") return true;
          return !c.igMediaId || !archivedIds.includes(c.igMediaId);
        })
        .map((c) => ({
          c,
          m: usesSupabase()
            ? c.igMediaId
              ? liveMetrics[c.igMediaId]
              : undefined
            : contentMetrics[c.id],
        }))
        .sort((a, b) => {
          const score = (m: NonNullable<typeof a.m>) => {
            if (topSort === "newest") return 0;
            if (topSort === "views") return m.views;
            if (topSort === "engagement") {
              const ti = (m as Partial<IgInsights>).total_interactions;
              return ti || m.likes + m.comments + m.shares + m.saves;
            }
            return m.reach;
          };
          const sa = a.m ? score(a.m) : -1;
          const sb = b.m ? score(b.m) : -1;
          return (
            sb - sa ||
            b.c.scheduledDate.localeCompare(a.c.scheduledDate) ||
            b.c.scheduledTime.localeCompare(a.c.scheduledTime)
          );
        }),
        [published, liveMetrics, archivedIds, fType, fRole, topSort]
  );

  // KPI = agregat level akun (tak kenal filter tipe).
  type Kpi = { label: string; value: string; delta: number | null; suffix?: string };
  const hasFilter = fType !== "all";
  const kpis: Kpi[] = [
    { label: "Total Published", value: String(published.length), delta: deltaPct(published.length, publishedPrev.length) },
    { label: "Total Reach", value: fmtNum(s.reach), delta: deltaPct(s.reach, p.reach) },
    { label: "Impressions", value: fmtNum(s.impressions), delta: deltaPct(s.impressions, p.impressions) },
    { label: "Engagement Rate", value: `${er.toFixed(1)}%`, delta: er - erPrev, suffix: " pts" },
  ];
  const accountKpis: Kpi[] = account
    ? [
        { label: "Views", value: fmtNum(account.cur.views), delta: deltaPct(account.cur.views, account.prev.views) },
        { label: "Accounts Engaged", value: fmtNum(account.cur.accounts_engaged), delta: deltaPct(account.cur.accounts_engaged, account.prev.accounts_engaged) },
        { label: "Total Interactions", value: fmtNum(account.cur.total_interactions), delta: deltaPct(account.cur.total_interactions, account.prev.total_interactions) },
        {
          label: "New Followers",
          // Net follows−unfollows dalam range (bukan total). % delta disengaja
          // null: % dari angka net menyesatkan (mis. +3 → −4 = −233%).
          value: (account.cur.follows_and_unfollows || account.growth_cur || 0) > 0
            ? `+${fmtNum(account.cur.follows_and_unfollows || account.growth_cur || 0)}`
            : fmtNum(account.cur.follows_and_unfollows || account.growth_cur || 0),
          delta: null,
        },
        ...(account.followers_now
          ? [{ label: "Total Followers", value: fmtNum(account.followers_now), delta: null as number | null }]
          : []),
      ]
    : [];
  // Rincian engagement di balik toggle (section akun tetap ringkas).
  const accountDetails: Kpi[] = account
    ? [
        { label: "Likes", value: fmtNum(account.cur.likes), delta: deltaPct(account.cur.likes, account.prev.likes) },
        { label: "Comments", value: fmtNum(account.cur.comments), delta: deltaPct(account.cur.comments, account.prev.comments) },
        { label: "Shares", value: fmtNum(account.cur.shares), delta: deltaPct(account.cur.shares, account.prev.shares) },
        { label: "Saves", value: fmtNum(account.cur.saves), delta: deltaPct(account.cur.saves, account.prev.saves) },
        { label: "Replies", value: fmtNum(account.cur.replies), delta: deltaPct(account.cur.replies, account.prev.replies) },
        { label: "Reposts", value: fmtNum(account.cur.reposts), delta: deltaPct(account.cur.reposts, account.prev.reposts) },
        { label: "Profile Views", value: fmtNum(account.cur.profile_views), delta: deltaPct(account.cur.profile_views, account.prev.profile_views) },
      ]
    : [];

  const maxReach = Math.max(...cur.map((d) => d.reach), 1);
  const maxEng = Math.max(...cur.map((d) => d.engagement), 1);
  const maxWeek = Math.max(...weekly.map((w) => w.count), 1);
  // Gaya saham ala etamhub: hijau naik, merah turun (titik terakhir vs pertama).
  const trendUp = cur.length < 2 || cur[cur.length - 1].reach >= cur[0].reach;
  const trendColor = trendUp ? "#10B981" : "#EF4444";
  const trendDelta = cur.length < 2 ? null : deltaPct(cur[cur.length - 1].reach, cur[0].reach);
  const reachData = cur.map((d) => ({ month: fmtDateShort(d.date), reach: d.reach }));

  const skeleton = "animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800";
  // Grafik butuh minimal 1 baris harian; tanpa itu pts[-1] crash.
  const showData = !loading && !loadError && daily.length > 0;

  return (
    <div>
      {/* Filters: range global. Filter tipe ada di bawah, hanya untuk Top Content. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={pill(range === r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI: blok stat flat langsung di background (tanpa kartu) */}
      <section className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={cn(skeleton, "h-20")} />)
          : loadError ? (
            <div className="col-span-full py-4">
              <p className="text-sm font-medium">Gagal memuat dari Supabase</p>
              <p className="mt-1 text-xs text-zinc-500">{loadError}</p>
            </div>
          ) : daily.length === 0 ? (
            <div className="col-span-full py-4">
              <p className="text-sm font-medium">Belum ada data analytics</p>
              <p className="mt-1 text-xs text-zinc-500">
                Tabel analytics_daily kosong — isi via seed atau sinkronisasi sebelum grafik tampil.
              </p>
            </div>
          ) : (
            kpis.map((k) => (
              <div key={k.label}>
                <p className="text-xs font-medium text-zinc-500">{k.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{k.value}</p>
                <div className="mt-0.5">
                  <Delta value={k.delta} suffix={k.suffix} />
                </div>
              </div>
            ))
          )}
      </section>

      {/* Expand analitik lengkap — Top Content di bawah tetap tampil dari awal */}
      {showData && (
        <>
          <button
            ref={fullBtnRef}
            onClick={toggleFull}
            aria-expanded={showFull}
            className="mx-auto mt-6 flex h-9 w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-b from-white/30 to-white/0 bg-zinc-900/[0.05] px-4 text-sm font-medium text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur-md hover:bg-zinc-900/10 dark:from-white/[0.07] dark:to-white/0 dark:bg-white/10 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)] dark:hover:bg-white/20"
          >
            {showFull ? "Sembunyikan analitik lengkap" : "Tampilkan analitik lengkap"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", showFull && "rotate-180")} />
          </button>
          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              showFull ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">

      {/* Section akun IG live: flat, pemisah divider rambut + badge LIVE */}
      {showData && accountKpis.length > 0 && (
        <section className="mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Aktivitas akun Instagram</h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              LIVE • {range} hari terakhir vs {range} sebelumnya
            </span>
          </div>
          <div
            className={cn(
              "grid grid-cols-2 gap-x-3 gap-y-5 pt-4 sm:grid-cols-3",
              accountKpis.length >= 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"
            )}
          >
            {accountKpis.map((k) => (
              <div key={k.label}>
                <p className="text-xs font-medium text-zinc-500">{k.label}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">{k.value}</p>
                <div className="mt-0.5">
                  <Delta value={k.delta} suffix={k.suffix} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-zinc-200 pt-3 sm:grid-cols-4 dark:border-zinc-800">
            {accountDetails.map((k) => (
              <p key={k.label} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-zinc-500">{k.label}</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  {k.value} <Delta value={k.delta} suffix={k.suffix} />
                </span>
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Comparison */}
      {showData && (
      <>
      <section className="mt-8 grid gap-x-3 gap-y-4 border-t border-zinc-200 pt-5 sm:grid-cols-2 dark:border-zinc-800">
        {[
          { title: "This week vs previous week", a: week.a, b: week.b },
          { title: month.label, a: month.a, b: month.b },
        ].map((c) => (
          <div key={c.title}>
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
          </div>
        ))}
      </section>

      {/* Charts: flat tanpa kartu, pisah divider rambut */}
      <div className="mt-8 grid gap-x-6 gap-y-8 border-t border-zinc-200 pt-5 lg:grid-cols-2 dark:border-zinc-800">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Reach over time</h3>
            <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
              {cur.length} hari terakhir <Delta value={trendDelta} />
            </span>
          </div>
          <div className="pt-3">
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
        </div>

        <div>
          <h3 className="text-sm font-semibold">Engagement over time</h3>
          <div className="pt-3">
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
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Published per week</h3>
            <span className="text-xs text-zinc-500">8 minggu terakhir</span>
          </div>
          <div className="pt-3">
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
        </div>
      </div>
        </>
      )}

            </div>
          </div>
        </>
      )}

      {/* Filter tipe + peran postingan — selalu tampil (untuk Top Content di bawah) */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setFType("all")} className={pill(fType === "all")}>All types</button>
        {(Object.keys(typeMeta) as ContentType[]).map((t) => (
          <button key={t} onClick={() => setFType(fType === t ? "all" : t)} className={pill(fType === t)}>
            {typeMeta[t].label}
          </button>
        ))}
        {hasFilter && (
          <button
            onClick={() => {
              setFType("all");
            }}
            className="text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            Reset
          </button>
        )}
        <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" aria-hidden />
        <button onClick={() => setFRole("all")} className={pill(fRole === "all")}>Semua peran</button>
        <button onClick={() => setFRole(fRole === "owner" ? "all" : "owner")} className={pill(fRole === "owner")}>
          Postingan sendiri
        </button>
        <button onClick={() => setFRole(fRole === "collaborator" ? "all" : "collaborator")} className={pill(fRole === "collaborator")}>
          Collab
        </button>
        {fRole !== "all" && (
          <button
            onClick={() => {
              setFRole("all");
            }}
            className="text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            Reset
          </button>
        )}
      </div>

      {/* Top content: panel berbingkai + header abu ala playlist YT */}
      <section className="mt-8 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="bg-zinc-100/80 px-4 py-3 dark:bg-[#212121]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">Top Content</h3>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                terbaru • {range} hari terakhir
                {hasFilter && ` • ${typeMeta[fType as ContentType].label}`}
                {fRole !== "all" && ` • ${fRole === "owner" ? "postingan sendiri" : "collab"}`}
                {archivedIds.length > 0 &&
                  ` • ${archivedIds.length} diarsip di IG (disembunyikan)`}
              </p>
            </div>
            {/* Sort: tombol ala "Tampilkan analitik lengkap" — aktif = gaya penuh */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["reach", "Reach"],
                  ["engagement", "Engagement"],
                  ["views", "Views"],
                  ["newest", "Terbaru"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTopSort(key)}
                  aria-pressed={topSort === key}
                  className={cn(
                    "flex h-7 items-center whitespace-nowrap rounded-full bg-gradient-to-b from-white/30 to-white/0 bg-zinc-900/[0.05] px-3 text-xs font-medium text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur-md hover:bg-zinc-900/10 dark:from-white/[0.07] dark:to-white/0 dark:bg-white/10 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)] dark:hover:bg-white/20",
                    topSort !== key &&
                      "text-zinc-500 shadow-none hover:bg-zinc-900/5 dark:text-zinc-400 dark:shadow-none dark:hover:bg-white/10"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
        {top.length === 0 ? (
          <p className="py-6 text-sm text-zinc-500">
            Tidak ada konten published pada rentang & filter ini.
          </p>
        ) : (
          <div className="flex flex-col">
                {top.map(({ c, m }) => {
                  const Icon = typeIcons[c.type];
                  const ti = (m as Partial<IgInsights> | undefined)?.total_interactions;
                  const eng = m ? (ti || m.likes + m.comments + m.shares + m.saves) : null;
                  const extra = (m ?? {}) as Partial<IgInsights>;
                  const open = expandedId === c.id;
                  // Sudah post → gambar dari IG; belum tertaut → ikon.
                  const pv = c.igMediaId ? previews[c.igMediaId] : undefined;
                  // Thumbnail IG di bawah; video/foto di atasnya — URL video IG
                  // cepat kedaluwarsa (media_url bisa hilang duluan), pas mati
                  // yang tampil thumbnail, bukan kosong.
                  const visual = (pv?.mediaUrl || pv?.thumbUrl)
                    ? {
                        url: pv?.mediaUrl ?? "",
                        thumbUrl: pv?.thumbUrl,
                        kind: pv?.mediaType === "VIDEO" || pv?.mediaType === "REELS" ? "video" : "image",
                      }
                    : null;
                  // media_url kosong/expired → tampil thumbnail sbg gambar biasa.
                  const visualIsVideo = visual?.kind === "video" && !!visual.url;
                  const details: { label: string; value: string }[] = m
                    ? [
                        { label: "Likes", value: fmtNum(m.likes) },
                        { label: "Comments", value: fmtNum(m.comments) },
                        { label: "Shares", value: fmtNum(m.shares) },
                        { label: "Saves", value: fmtNum(m.saves) },
                        { label: "Reposts", value: extra.reposts ? fmtNum(extra.reposts) : "—" },
                        { label: "Follows", value: extra.follows ? fmtNum(extra.follows) : "—" },
                        { label: "Profile visits", value: extra.profile_visits ? fmtNum(extra.profile_visits) : "—" },
                        { label: "Total interactions", value: fmtNum(ti || m.likes + m.comments + m.shares + m.saves) },
                      ]
                    : [];
                  const erPct = eng !== null && m && m.reach > 0 ? ((eng / m.reach) * 100).toFixed(1) : null;
                  return (
                    <Fragment key={c.id}>
                      {/* Baris ala list "up next" YT: hover full-bleed tanpa rounded */}
                      <div className="flex gap-3 px-4 py-2 hover:bg-white/70 dark:hover:bg-zinc-800/60">
                        <Link
                          href={`/content/${c.id}`}
                          className={cn("relative aspect-video w-16 shrink-0 overflow-hidden rounded bg-gradient-to-br sm:w-20", c.tone)}
                        >
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-zinc-500" />
                          </span>
                          {visual &&
                            (visualIsVideo ? (
                              <>
                                {visual.thumbUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={visual.thumbUrl}
                                    alt=""
                                    loading="lazy"
                                    className="absolute inset-0 h-full w-full object-cover"
                                  />
                                )}
                                <video
                                  src={visual.url}
                                  poster={visual.thumbUrl}
                                  preload="metadata"
                                  muted
                                  playsInline
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              </>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={visual.url || visual.thumbUrl}
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ))}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/content/${c.id}`} className="line-clamp-1 text-sm font-medium hover:underline">
                            {c.title}
                          </Link>
                          <p className="mt-1 text-xs text-zinc-500">
                            {m && eng !== null
                              ? [
                                  m.reach > 0 ? `${fmtNum(m.reach)} reach` : null,
                                  m.views > 0 ? `${fmtNum(m.views)} views` : null,
                                  `${fmtNum(eng)}${erPct ? ` (${erPct}%)` : ""}`,
                                ]
                                  .filter(Boolean)
                                  .join(" • ")
                              : "Belum ada metrik IG"}
                          </p>
                        </div>
                        {/* Tiga kolom tabel di kanan: peran, tipe & tanggal, lebar tetap agar rata antar baris */}
                        <span
                          className={cn(
                            "w-16 shrink-0 self-center text-left text-xs",
                            (c.postRole ?? "owner") === "collaborator"
                              ? "font-medium text-violet-600 dark:text-violet-300"
                              : "text-zinc-500"
                          )}
                        >
                          {(c.postRole ?? "owner") === "collaborator" ? "Collab" : "Sendiri"}
                        </span>
                        <span className="w-16 shrink-0 self-center text-left text-xs text-zinc-500">
                          {typeMeta[c.type].label}
                        </span>
                        <span className="w-16 shrink-0 self-center text-right text-xs tabular-nums text-zinc-500">
                          {fmtDateShort(c.scheduledDate)}
                        </span>
                        <button
                          onClick={() => setExpandedId(open ? null : c.id)}
                          aria-expanded={open}
                          aria-label={open ? "Tutup rincian" : "Lihat rincian"}
                            className="inline-flex h-fit shrink-0 self-center rounded-full p-1 text-zinc-400 backdrop-blur-md hover:bg-zinc-200/70 hover:text-zinc-700 dark:hover:bg-zinc-700/70 dark:hover:text-zinc-200"
                        >
                          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                        </button>
                      </div>
                      {/* Rincian selalu dirender; buka-tutup via animasi grid-rows */}
                      <div
                        className={cn(
                          "grid transition-all duration-300 ease-in-out",
                          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="px-4 py-3">
                            {m ? (
                              <>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                                  {details.map((d) => (
                                    <p key={d.label} className="flex items-baseline justify-between gap-2 text-sm">
                                      <span className="text-zinc-500">{d.label}</span>
                                      <span className="font-medium">{d.value}</span>
                                    </p>
                                  ))}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                  <Link href={`/content/${c.id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                                    Buka detail konten
                                  </Link>
                                  {c.publishedUrl && (
                                    <a href={c.publishedUrl} target="_blank" rel="noreferrer" className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                                      Lihat di Instagram
                                    </a>
                                  )}
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-zinc-500">
                                Belum ada metrik IG untuk konten ini (belum tertaut atau insights kedaluwarsa).
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
