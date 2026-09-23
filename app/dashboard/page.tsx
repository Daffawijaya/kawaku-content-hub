"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TopContentTable, type TopContentItem } from "@/components/top-content-table";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import {
  type ContentStatus,
  type ManagedContent,
} from "@/lib/mock";
import { listContents, type ContentThumb } from "@/lib/content-db";
import type { IgPreview } from "@/lib/instagram/client";
import { getBrowserClient } from "@/lib/supabase/client";

const DAY_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

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
    return {
      total: items.length,
      draft: n("draft"),
      stok: n("idea"),
      scheduled: n("scheduled"),
      published: n("published"),
    };
  }, [items]);

  const stats = [
    { key: "total", label: "Total Konten", value: String(counts.total) },
    { key: "stok", label: "Stok", value: String(counts.stok) },
    { key: "scheduled", label: "Scheduled", value: String(counts.scheduled) },
    { key: "published", label: "Published", value: String(counts.published) },
  ];

  const statusShare = [
    { label: "Published", value: counts.published, total: Math.max(counts.total, 1) },
    { label: "Scheduled", value: counts.scheduled, total: Math.max(counts.total, 1) },
    { label: "Stok", value: counts.stok, total: Math.max(counts.total, 1) },
    { label: "Draft", value: counts.draft, total: Math.max(counts.total, 1) },
  ];

  const upcomingItems = useMemo<TopContentItem[]>(
    () =>
      items
        .filter((c) => c.status === "scheduled")
        .sort((a, b) => `${a.scheduledDate} ${a.scheduledTime}`.localeCompare(`${b.scheduledDate} ${b.scheduledTime}`))
        .slice(0, 5)
        .map((c) => ({ c })),
    [items]
  );

  const stockItems = useMemo<TopContentItem[]>(
    () =>
      items
        .filter((c) => c.status === "idea")
        .sort((a, b) => `${b.scheduledDate} ${b.scheduledTime}`.localeCompare(`${a.scheduledDate} ${a.scheduledTime}`))
        .slice(0, 5)
        .map((c) => ({ c })),
    [items]
  );

  const draftItems = useMemo<TopContentItem[]>(
    () =>
      items
        .filter((c) => c.status === "draft")
        .sort((a, b) => `${b.scheduledDate} ${b.scheduledTime}`.localeCompare(`${a.scheduledDate} ${a.scheduledTime}`))
        .slice(0, 5)
        .map((c) => ({ c })),
    [items]
  );

  type DashboardTab = "upcoming" | "stock" | "draft";
  const [tab, setTab] = useState<DashboardTab>("upcoming");

  const tabConfig: Record<DashboardTab, { title: string; items: TopContentItem[]; emptyText: string; href: string; linkLabel: string }> = {
    upcoming: { title: "Konten Mendatang", items: upcomingItems, emptyText: "Belum ada konten terjadwal.", href: "/calendar", linkLabel: "Lihat kalender" },
    stock: { title: "Stok", items: stockItems, emptyText: "Belum ada stok konten.", href: "/content", linkLabel: "Lihat stok" },
    draft: { title: "Draft", items: draftItems, emptyText: "Belum ada draft konten.", href: "/content", linkLabel: "Lihat draft" },
  };
  const activeTab = tabConfig[tab];

  const recentItems = useMemo<TopContentItem[]>(
    () =>
      items
        .filter((c) => c.status === "published")
        .sort((a, b) => `${b.scheduledDate} ${b.scheduledTime}`.localeCompare(`${a.scheduledDate} ${a.scheduledTime}`))
        .slice(0, 5)
        .map((c) => ({ c })),
    [items]
  );

  // Thumbnail tabel = preview IG (sama seperti analytics).
  const [previews, setPreviews] = useState<Record<string, IgPreview>>({});
  // Fallback poster Drive utk baris tanpa visual IG (mis. Konten Mendatang).
  const [thumbs, setThumbs] = useState<Record<string, ContentThumb>>({});
  useEffect(() => {
    fetch("/api/drive/list")
      .then((r) => r.json())
      .then((j) => {
        const m: Record<string, ContentThumb> = {};
        for (const a of ((j as { assets?: { drive_file_id: string; kind: string; usedBy?: string[] }[] }).assets ?? [])) {
          if (!a.drive_file_id || a.drive_file_id.startsWith("drive_mock_")) continue;
          for (const cid of a.usedBy ?? []) {
            m[cid] ??= { driveFileId: a.drive_file_id, kind: a.kind };
          }
        }
        setThumbs(m);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const ids = [...upcomingItems, ...stockItems, ...draftItems, ...recentItems]
      .map((r) => r.c.igMediaId)
      .filter((v): v is string => !!v);
    if (ids.length === 0) return;
    fetch(`/api/instagram/insights?ids=${[...new Set(ids)].join(",")}`)
      .then((r) => r.json())
      .then((j) => {
        if ((j as { ok?: boolean }).ok) setPreviews((j as { previews?: Record<string, IgPreview> }).previews ?? {});
      })
      .catch(() => undefined);
  }, [upcomingItems, stockItems, draftItems, recentItems]);

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

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title={`${greeting()}, ${userName} 👋`}
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
              </div>
            ))}
      </section>

      {/* Upcoming/Stok/Draft (kiri) + This Week & Status ditumpuk vertikal (kanan) */}
      <div className="mt-8 grid gap-x-6 gap-y-8 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          <UnderlineTabs
            ariaLabel="Pilih tabel konten"
            value={tab}
            onChange={setTab}
            options={[
              { value: "upcoming", label: "Konten Mendatang" },
              { value: "stock", label: "Stok" },
              { value: "draft", label: "Draft" },
            ]}
          />
          <TopContentTable
            key={tab}
            title={activeTab.title}
            items={activeTab.items}
            loading={loading}
            insightsLoading={false}
            previews={previews}
            thumbs={thumbs}
            sort="newest"
            expandable={false}
            emptyText={activeTab.emptyText}
            action={
              <Link
                href={activeTab.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {activeTab.linkLabel} <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
        </div>

        <div className="space-y-8 lg:col-span-2">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Minggu Ini</h3>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                Buka <ArrowUpRight className="h-3 w-3" />
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
                    <p className="text-[11px] opacity-80">{d.count} konten</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Status Konten</h3>
            <div className="space-y-3 pt-3">
              {statusShare.map((s) => (
                <div key={s.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-zinc-500">{s.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-900 dark:bg-white"
                      style={{ width: `${Math.round((s.value / s.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent: pakai komponen Top Content, isi tetap 5 postingan terbaru */}
      <div className="mt-8">
        <TopContentTable
          title="Konten Terbaru"
          items={recentItems}
          loading={loading}
          insightsLoading={false}
          previews={previews}
          thumbs={thumbs}
          sort="newest"
          expandable={false}
          action={
            <Link
              href="/content"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Lihat semua <ArrowRight className="h-3 w-3" />
            </Link>
          }
        />
      </div>
    </div>
  );
}
