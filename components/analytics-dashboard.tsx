"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Minus,
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
  typeMeta,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { listAnalyticsDaily, type DailyRow } from "@/lib/analytics-db";
import { listContents, usesSupabase } from "@/lib/content-db";
import type { AccountTotals, IgInsights, IgPreview } from "@/lib/instagram/client";
import { TopContentTable, type TopContentItem, type TopSortKey } from "@/components/top-content-table";
import { Pagination } from "@/components/ui/pagination";
import { Segmented } from "@/components/ui/segmented";
import { glassPillVisual } from "@/components/ui/glass-pill";

const ranges = [
  { key: 7, label: "Minggu" },
  { key: 30, label: "Bulan" },
  { key: 365, label: "Tahun" },
  { key: "all", label: "Semua" },
] as const;

type RangeKey = (typeof ranges)[number]["key"];

// 1 halaman Top Content analytics (samakan dgn /content: 10/halaman).
const TOP_PAGE_SIZE = 10;

const pill = (active: boolean) =>
  active
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white min-h-[36px] sm:min-h-0 dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 min-h-[36px] sm:min-h-0 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

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
  // Tanpa pembanding = tampil kosong (tanpa strip "--").
  if (value === null) return null;
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

function toISODate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftISODate(date: Date, days: number) {
  const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  x.setDate(x.getDate() + days);
  return toISODate(x);
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState<RangeKey>(30);
  // All = seluruh data dari awal (batas bawah "" lolos semua tgl ISO).
  const isAll = range === "all";
  const rangeSpan = isAll || range === 365 ? "1 tahun" : `${range} hari`;
  // Filter tipe multi-pilih ala /content: kosong = semua.
  const [fTypes, setFTypes] = useState<ContentType[]>([]);
  function toggleType(v: ContentType) {
    setFTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [contents, setContents] = useState<ManagedContent[]>([]);
  // Preview thumbnail dari BE (key = ig_media_id).
  const [previews, setPreviews] = useState<Record<string, IgPreview>>({});
  // Top Content dari BE (filter + sort + pagination di server).
  const [topItems, setTopItems] = useState<TopContentItem[]>([]);
  const [topTotal, setTopTotal] = useState(0);
  const [topPage, setTopPage] = useState(1);
  const [topLoading, setTopLoading] = useState(true);
  const [topError, setTopError] = useState<string | null>(null);
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
  // Urutan Top Content: reach tertinggi dulu (bukan tanggal).
  const [topSort, setTopSort] = useState<TopSortKey>("reach");
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    // Error tampil apa adanya — tanpa fallback angka palsu.
    Promise.all([listAnalyticsDaily(), listContents()])
      .then(([d, c]) => {
        setDaily(d);
        setContents(c);
      })
      .catch((e: unknown) => {
        setDaily([]);
        setLoadError(e instanceof Error ? e.message : "Gagal memuat analitik.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Top Content dari BE — filter + sort + pagination diatur server.
  function loadTop() {
    setTopLoading(true);
    setTopError(null);
    const sp = new URLSearchParams({
      range: String(range),
      type: fTypes.length > 0 ? fTypes.join(",") : "all",
      sort: topSort,
      page: String(topPage),
      limit: String(TOP_PAGE_SIZE),
    });
    fetch(`/api/analytics/top-content?${sp}`)
      .then((r) => r.json())
      .then((j) => {
        const d = j as {
          error?: string;
          items?: { c: ManagedContent; m: IgInsights | null }[];
          total?: number;
          previews?: Record<string, IgPreview>;
        };
        if (d.error) throw new Error(d.error);
        setTopItems((d.items ?? []).map((it) => ({ c: it.c, m: it.m ?? undefined })));
        setTopTotal(d.total ?? 0);
        setPreviews((p) => ({ ...p, ...(d.previews ?? {}) }));
      })
      .catch((e: unknown) => {
        setTopItems([]);
        setTopTotal(0);
        setTopError(e instanceof Error ? e.message : "Gagal memuat Konten Teratas.");
      })
      .finally(() => setTopLoading(false));
  }

  useEffect(() => {
    // loadTop() me-reset state sync (pola yg sama dipakai tombol "Coba lagi").
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, fTypes, topSort, topPage]);

  // Kembali ke halaman 1 tiap filter/sort berubah.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTopPage(1);
  }, [range, fTypes, topSort]);

  // Rule: Analytics = konten published = gambar dari IG saja.
  // Drive hanya utk stok (halaman content/detail), tidak di-fetch di sini.
  // Totals akun live mengikuti range yg dipilih (All = 1 tahun, batas praktis Insights).
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

  // Rentang selalu dijangkar ke kalender hari ini, bukan ke baris analytics_daily
  // terakhir (yang bisa bolong/tertinggal). Bulan = 30 hari kalender terakhir,
  // All = dari awal (batas bawah "" + prev kosong = tanpa komparasi).
  const todayStr = useMemo(() => toISODate(new Date()), []);
  const rangeStart = useMemo(() => (isAll ? "" : shiftISODate(new Date(), 1 - range)), [range, isAll]);
  const prevStart = useMemo(() => (isAll ? "" : shiftISODate(new Date(), 1 - range * 2)), [range, isAll]);
  const prevEnd = useMemo(() => (isAll ? "" : shiftISODate(new Date(), -range)), [range, isAll]);
  const cur = useMemo(
    () =>
      daily
        .filter((d) => d.date >= rangeStart && d.date <= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [daily, rangeStart, todayStr]
  );
  const prev = useMemo(
    () =>
      daily
        .filter((d) => d.date >= prevStart && d.date <= prevEnd)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [daily, prevStart, prevEnd]
  );
  const s = useMemo(() => sum(cur), [cur]);
  const p = useMemo(() => sum(prev), [prev]);
  const er = s.reach > 0 ? (s.engagement / s.reach) * 100 : 0;
  const erPrev = p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;

  const inRange = (d: string) => d >= rangeStart && d <= todayStr;
  const matchTC = (t: ContentType) => fTypes.length === 0 || fTypes.includes(t);

  // Analytics hanya memakai postingan milik sendiri.
  const isOwner = (c: { postRole?: string | null }) => (c.postRole ?? "owner") === "owner";
  const published = useMemo(
    () =>
      contents.filter(
        (c) => c.status === "published" && isOwner(c) && inRange(c.scheduledDate)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contents, rangeStart, todayStr]
  );
  const publishedPrev = useMemo(
    () =>
      contents.filter(
        (c) =>
          c.status === "published" &&
          isOwner(c) &&
          c.scheduledDate >= prevStart &&
          c.scheduledDate <= prevEnd
      ),
    [contents, prevStart, prevEnd]
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
          isOwner(c) &&
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contents, fTypes]);

  // KPI = agregat level akun (tak kenal filter tipe).
  type Kpi = { label: string; value: string; delta: number | null; suffix?: string };

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
  // Garis grafik ngikut tema (hitam di light, putih di dark) via currentColor.
  const trendDelta = cur.length < 2 ? null : deltaPct(cur[cur.length - 1].reach, cur[0].reach);
  const reachData = cur.map((d) => ({ month: fmtDateShort(d.date), reach: d.reach }));

  const skeleton = "animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800";
  // Grafik butuh minimal 1 baris harian; tanpa itu pts[-1] crash.
  const showData = !loading && !loadError && daily.length > 0;

  return (
    <div>
      {/* Filters: range global ala segmented kalender. Filter tipe ada di bawah. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Segmented
          ariaLabel="Rentang analitik"
          value={range}
          onChange={setRange}
          options={ranges.map((r) => ({ value: r.key, label: r.label }))}
        />
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
              <p className="text-sm font-medium">Belum ada data analitik</p>
              <p className="mt-1 text-xs text-zinc-500">
                Tabel analytics_daily kosong — isi via seed atau sinkronisasi sebelum grafik tampil.
              </p>
            </div>
          ) : (
            kpis.map((k) => (
              <div key={k.label}>
                <p className="text-[11px] font-medium text-zinc-500 sm:text-xs">{k.label}</p>
                <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{k.value}</p>
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
            className={`${glassPillVisual} mx-auto mt-6 min-h-[44px] sm:min-h-0`}
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
              LIVE • {rangeSpan} terakhir vs sebelumnya
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
                <p className="text-[11px] font-medium text-zinc-500 sm:text-xs">{k.label}</p>
                <p className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{k.value}</p>
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
          { title: "Minggu ini vs minggu lalu", a: week.a, b: week.b },
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
            <h3 className="text-sm font-semibold">Reach dari waktu ke waktu</h3>
            <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
              {isAll ? `${cur.length} hari • semua waktu` : `${cur.length} hari terakhir`} <Delta value={trendDelta} />
            </span>
          </div>
          <div className="pt-3">
            {loading ? (
              <div className={cn(skeleton, "h-44")} />
            ) : (
              <div className="h-[280px] text-zinc-900 dark:text-white">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={reachData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="currentColor" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
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
                      stroke="currentColor"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, stroke: "currentColor", strokeWidth: 2, fill: "#fff" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Engagement dari waktu ke waktu</h3>
          <div className="pt-3">
            {loading ? (
              <div className={cn(skeleton, "h-36")} />
            ) : (
              <div className="flex h-36 items-end gap-1" role="img" aria-label="Engagement dari waktu ke waktu">
                {cur.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${fmtNum(d.engagement)}`}
                    className="flex-1 rounded-sm bg-zinc-900 dark:bg-white"
                    style={{ height: `${Math.max(4, (d.engagement / maxEng) * 100)}%` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Published per minggu</h3>
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
              <div className="flex h-36 items-end gap-2" role="img" aria-label="Published per minggu">
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

      {/* Filter tipe — milik tabel Top Content. Mobile: scroll satu baris. */}
      <div className="-mx-4 mt-8 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-10 sm:flex-wrap sm:px-0 sm:pb-0">
        {(Object.keys(typeMeta) as ContentType[]).filter((t) => t !== "story").map((t) => (
          <button key={t} onClick={() => toggleType(t)} className={cn(pill(fTypes.includes(t)), "shrink-0 sm:shrink")}>
            {typeMeta[t].label}
          </button>
        ))}
      </div>

      {/* Top content: 1 halaman dari BE + pagination ala /content.
          Refresh (halaman/filter/sort) mempertahankan baris lama + redup
          agar tinggi tabel stabil — scroll tidak lompat. Skeleton hanya
          saat data kosong (muat pertama). */}
      <div className={cn("transition-opacity", topLoading && topItems.length > 0 && "pointer-events-none opacity-60")}>
      <TopContentTable
        items={topItems}
        loading={topLoading && topItems.length === 0}
        insightsLoading={false}
        previews={previews}
        sort={topSort}
        onSortChange={setTopSort}
        error={
          topError ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium">Gagal memuat Konten Teratas</p>
              <p className="mt-1 text-xs text-zinc-500">{topError}</p>
              <button
                onClick={() => loadTop()}
                className="mt-3 inline-flex min-h-[44px] items-center text-xs font-medium text-zinc-900 hover:underline sm:min-h-0 dark:text-zinc-100"
              >
                Coba lagi
              </button>
            </div>
          ) : null
        }
      />
      <Pagination
        page={topPage}
        pageCount={Math.max(1, Math.ceil(topTotal / TOP_PAGE_SIZE))}
        onChange={setTopPage}
      />
      </div>
    </div>
  );
}
