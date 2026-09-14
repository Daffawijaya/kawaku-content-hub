"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  typeMeta,
  type ContentStatus,
  type ManagedContent,
} from "@/lib/mock";
import { getAllContent } from "@/lib/content-store";
import { listContents, usesSupabase } from "@/lib/content-db";
import { getBrowserClient } from "@/lib/supabase/client";

const statIcons = [FileText, Archive, CalendarDays, CircleCheck] as const;

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

function fmtLongDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export default function DashboardPage() {
  const [items, setItems] = useState<ManagedContent[]>(() => getAllContent());
  const [userName, setUserName] = useState("Daffa");

  useEffect(() => {
    if (!usesSupabase()) {
      setItems(getAllContent());
      return;
    }
    listContents().then(setItems).catch(() => setItems(getAllContent()));
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

  const recent = useMemo(
    () =>
      items
        .filter((c) => c.status === "published")
        .sort((a, b) => `${b.scheduledDate} ${b.scheduledTime}`.localeCompare(`${a.scheduledDate} ${a.scheduledTime}`))
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          title: c.title,
          format: typeMeta[c.type].label,
          status: c.status,
          date: fmtLongDate(c.scheduledDate),
        })),
    [items]
  );

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
    <div>
      <PageHeader
        title={`${greeting()}, ${userName} 👋`}
        description={`${todayLong} — berikut ringkasan aktivitas konten KAWAKU hari ini.`}
        action={
          <Link href="/content/create">
            <Button>Buat Konten</Button>
          </Link>
        }
      />

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = statIcons[i];
          return (
            <Card key={s.key} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {s.label}
                </p>
                <Icon className="h-4 w-4 text-zinc-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{s.value}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{s.delta}</p>
            </Card>
          );
        })}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Upcoming */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Upcoming Content</CardTitle>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              View calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <ul className="divide-y divide-zinc-100 px-5 pb-3 dark:divide-zinc-800">
            {upcoming.length === 0 && (
              <li className="py-6 text-center text-sm text-zinc-500">
                Belum ada konten terjadwal.
              </li>
            )}
            {upcoming.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {item.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {item.date} • {item.assignee}
                  </p>
                </div>
                <div className="hidden shrink-0 gap-1.5 sm:flex">
                  <Badge>{item.format}</Badge>
                  <StatusBadge status={item.status} />
                </div>
                <span className="sm:hidden">
                  <StatusBadge status={item.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Calendar preview + status */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>This Week</CardTitle>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                Open <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <div className="grid grid-cols-7 gap-1 px-5 pb-5">
              {weekPreview.map((d) => (
                <div
                  key={d.day}
                  className={
                    d.active
                      ? "rounded-lg bg-brand-600 py-2 text-center text-white"
                      : "rounded-lg py-2 text-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Status</CardTitle>
            </CardHeader>
            <div className="space-y-3 px-5 pb-5">
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
          </Card>
        </div>
      </div>

      {/* Recent */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Content</CardTitle>
          <Link
            href="/content"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-y border-zinc-100 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-5 py-2.5 font-medium">Title</th>
                <th className="px-3 py-2.5 font-medium">Format</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-zinc-500">
                    Belum ada konten published.
                  </td>
                </tr>
              )}
              {recent.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-5 py-3 font-medium">{item.title}</td>
                  <td className="px-3 py-3 text-zinc-500">{item.format}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-500">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
