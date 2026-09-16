"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TopContentTable, type TopContentItem } from "@/components/top-content-table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  typeMeta,
  type ContentStatus,
  type ManagedContent,
} from "@/lib/mock";
import { listContents } from "@/lib/content-db";
import type { IgPreview } from "@/lib/instagram/client";
import { getBrowserClient } from "@/lib/supabase/client";

const DAY_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDayTime(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${s} • ${time}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function DashboardPage() {
  const [items, setItems] = useState<ManagedContent[]>([]);
  const [userName, setUserName] = useState("Tim KAWAKU");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listContents()
      .then(setItems)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Gagal memuat konten."))
      .finally(() => setLoading(false));
    getBrowserClient()
      ?.auth.getUser()
      .then(({ data }) => {
        const u = data.user;
        if (!u) return;
        const name =
          (u.user_metadata?.full_name as string | undefined) ?? u.email?.split("@")[0];
        if (name) setUserName(name.split(" ")[0]);
      })
      .catch(() => undefined);
  }, []);

  const counts = useMemo(() => {
    const n = (s: ContentStatus) => items.filter((c) => c.status === s).length;
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return {
      total: items.length,
      stok: n("idea"),
      scheduled: n("scheduled"),
      published: n("published"),
      scheduledWeek: items.filter((c) => c.status === "scheduled" && c.scheduledDate <= iso(weekFromNow)).length,
      publishedMonth: items.filter((c) => c.status === "published" && c.scheduledDate >= iso(monthAgo)).length,
    };
  }, [items]);

  const stats = [
    { key: "total", label: "Total Content", value: String(counts.total), delta: "semua status" },
    { key: "stok", label: "Stok", value: String(counts.stok), delta: "siap dijadwalkan" },
    { key: "scheduled", label: "Scheduled", value: String(counts.scheduled), delta: `${counts.scheduledWeek} minggu ini` },
    { key: "published", label: "Published", value: String(counts.published), delta: `+${counts.publishedMonth} 30 hari` },
  ];

  const statusShare = [
    { label: "Published", value: counts.published, total: Math.max(counts.total, 1) },
    { label: "Scheduled", value: counts.scheduled, total: Math.max(counts.total, 1) },
    { label: "Stok", value: counts.stok, total: Math.max(counts.total, 1) },
  ];

  const upcoming = useMemo(
    () =>
      items
        .filter((c) => c.status === "scheduled")
        .sort((a, b) => `${a.scheduledDate} ${a.scheduledTime}`.localeCompare(`${b.scheduledDate} ${b.scheduledTime}`))
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          title: c.title,
          format: typeMeta[c.type].label,
          status: c.status,
          date: fmtDayTime(c.scheduledDate, c.scheduledTime),
          assignee: c.pic.split(",")[0]?.trim() || "—",
          initials: initialsOf(c.pic.split(",")[0]?.trim() || "?"),
        })),
    [items]
  );

  const recentItems = useMemo<TopContentItem[]>(
    () =>
      items
        .filter((c) => c.status === "published")
        .sort((a, b) => `${b.scheduledDate} ${b.scheduledTime}`.localeCompare(`${a.scheduledDate} ${a.scheduledTime}`))
        .slice(0, 5)
        .map((c) => ({ c })),
    [items]
  );

  // Thumbnail recent = preview IG (sama seperti analytics).
  const [previews, setPreviews] = useState<Record<string, IgPreview>>({});
  useEffect(() => {
    const ids = recentItems.map((r) => r.c.igMediaId).filter((v): v is string => !!v);
    if (ids.length === 0) return;
    fetch(`/api/instagram/insights?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((j) => {
        if ((j as { ok?: boolean }).ok) setPreviews((j as { previews?: Record<string, IgPreview> }).previews ?? {});
      })
      .catch(() => undefined);
  }, [recentItems]);

  const weekPreview = useMemo(() => {
    const now = new Date();
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return {
        day: DAY_ID[d.getDay()],
        date: String(d.getDate()),
        count: items.filter((c) => c.status !== "idea" && c.scheduledDate === key).length,
        active: key === iso(now),
      };
    });
  }, [items]);

  const todayLong = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title={`${greeting()}, ${userName} 👋`}
        description={`${todayLong} — berikut ringkasan aktivitas konten KAWAKU hari ini.`}
        action={
          <Link href="/content/create">
            <Button>Buat Konten</Button>
          </Link>
        }
      />

      {loadError && (
        <p className="mb-4 text-sm text-rose-600 dark:text-rose-400">{loadError}</p>
      )}

      {/* Stats: blok flat langsung di background (tanpa kartu), ala analytics */}
      <section className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-md bg-zinc-100 h-20 dark:bg-zinc-800" />
            ))
          : stats.map((s) => (
              <div key={s.key}>
                <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{s.delta}</p>
              </div>
            ))}
      </section>

      {/* Upcoming: list ala "up next" YT, pisah divider rambut */}
      <section className="mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Upcoming Content</h3>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            View calendar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="flex flex-col pt-1">
          {upcoming.length === 0 && (
            <li className="py-6 text-sm text-zinc-500">
              Belum ada konten terjadwal.
            </li>
          )}
          {upcoming.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {item.initials}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/content/${item.id}`} className="line-clamp-1 text-sm font-medium hover:underline">
                  {item.title}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {item.date} • {item.assignee}
                </p>
              </div>
              <div className="hidden shrink-0 gap-1.5 sm:flex">
                <Badge>{item.format}</Badge>
                <StatusBadge status={item.status} />
              </div>
              <span className="shrink-0 sm:hidden">
                <StatusBadge status={item.status} />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* This Week + Status: flat berdampingan, pisah divider rambut */}
      <div className="mt-8 grid gap-x-6 gap-y-8 border-t border-zinc-200 pt-5 lg:grid-cols-5 dark:border-zinc-800">
        <div className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">This Week</h3>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Open <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-1 pt-3">
            {weekPreview.map((d) => (
              <div
                key={d.day}
                className={
                  d.active
                    ? "rounded-lg bg-zinc-900 py-2 text-center text-white dark:bg-white dark:text-zinc-900"
                    : "rounded-lg py-2 text-center hover:bg-zinc-900/5 dark:hover:bg-white/10"
                }
              >
                <p className="text-[11px] opacity-80">{d.day}</p>
                <p className="text-sm font-semibold">{d.date}</p>
                {d.count > 0 && (
                  <p className="text-[11px] opacity-80">{d.count} post</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold">Content Status</h3>
          <div className="space-y-3 pt-3">
            {statusShare.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-zinc-500">{s.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.round((s.value / s.total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent: pakai komponen Top Content, isi tetap 5 postingan terbaru */}
      <div className="mt-8">
        <TopContentTable
          title="Recent Content"
          items={recentItems}
          loading={loading}
          insightsLoading={false}
          previews={previews}
          sort="newest"
          subtitle="Postingan terbaru • milik sendiri"
          expandable={false}
          action={
            <Link
              href="/content"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
      </div>
    </div>
  );
}
