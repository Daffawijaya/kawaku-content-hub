import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  Clock,
  FileText,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  recentContent,
  stats,
  upcomingContent,
  weekPreview,
} from "@/lib/mock";

const statIcons = [FileText, Clock, Send, CalendarDays, CircleCheck] as const;

const statusShare = [
  { label: "Published", value: 54, total: 128 },
  { label: "Scheduled", value: 32, total: 128 },
  { label: "Draft", value: 24, total: 128 },
  { label: "In Review", value: 18, total: 128 },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Selamat pagi, Daffa 👋"
        description="Senin, 14 September 2026 — berikut ringkasan aktivitas konten KAWAKU hari ini."
        action={
          <Link href="/content/create">
            <Button>Buat Konten</Button>
          </Link>
        }
      />

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
            {upcomingContent.map((item) => (
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
                <th className="px-3 py-2.5 font-medium">Channel</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentContent.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <td className="px-5 py-3 font-medium">{item.title}</td>
                  <td className="px-3 py-3 text-zinc-500">{item.format}</td>
                  <td className="px-3 py-3 text-zinc-500">{item.channel}</td>
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
