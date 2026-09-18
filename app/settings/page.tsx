"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { CheckCircle2, Camera, Monitor, Moon, RefreshCw, Send, Sun } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { pillGlass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBrowserClient } from "@/lib/supabase/client";

// Section flat ala analytics: divider rambut antar grup, tanpa Card.
const section = "mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-800";
const pill = (active: boolean) =>
  active
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  // Profil asli dari Supabase (auth + tabel profiles, peran diatur admin).
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    role: string;
    initials: string;
  } | null>(null);
  const [ig, setIg] = useState<{
    instagram: boolean;
    userId?: string;
    quota?: { quota_total?: number; quota_usage?: number };
    token?: { expiresAt?: string | null; daysLeft?: number | null; autoRefresh?: boolean };
    error?: string;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pubbing, setPubbing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(async ({ data }) => {
        const user = data.user;
        if (!user) return;
        const { data: row } = await supabase
          .from("profiles")
          .select("name, email, role, initials")
          .eq("id", user.id)
          .single();
        const name =
          (row?.name as string | undefined) ??
          (user.user_metadata?.full_name as string | undefined) ??
          user.email?.split("@")[0] ??
          "User";
        setProfile({
          name,
          email: (row?.email as string | undefined) ?? user.email ?? "",
          role: (row?.role as string | undefined) ?? "viewer",
          initials:
            (row?.initials as string | undefined) ||
            name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase(),
        });
      });
    }
    fetch("/api/instagram/status")
      .then((r) => r.json())
      .then(setIg)
      .catch(() => setIg({ instagram: false }));
  }, []);

  async function publishDueNow() {
    setPubbing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/instagram/autopublish", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        due?: number;
        published?: string[];
        failed?: { id: string; error: string }[];
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Autopublish gagal (HTTP ${res.status}).`);
      const ok = json.published?.length ?? 0;
      const fail = json.failed?.length ?? 0;
      setSyncMsg(
        `Autopublish selesai: ${ok} terpublish dari ${json.due ?? 0} due${fail > 0 ? `, ${fail} gagal (tetap scheduled, cek IG card di detail)` : ""}.`
      );
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Autopublish gagal.");
    } finally {
      setPubbing(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/instagram/sync", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        imported?: number;
        total?: number;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Sync gagal (HTTP ${res.status}).`);
      setSyncMsg(`Sync selesai: ${json.imported} baru dari ${json.total} postingan.`);
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Sync gagal.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Pengaturan"
      />

      <div>
        <section>
          <h3 className="text-sm font-semibold">Profil</h3>
          {profile ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                {profile.initials || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{profile.name}</p>
                <p className="truncate text-xs text-zinc-500">{profile.email} • {profile.role}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Memuat profil…</p>
          )}
          <p className="mt-3 text-xs text-zinc-500">Diambil dari akun login. Peran diatur admin di tabel profiles.</p>
        </section>

        <section className={section}>
          <h3 className="text-sm font-semibold">Tampilan</h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              { value: "light" as const, label: "Terang", icon: Sun },
              { value: "dark" as const, label: "Gelap", icon: Moon },
              { value: "system" as const, label: "Sistem", icon: Monitor },
            ].map((o) => {
              const Icon = o.icon;
              const active = (theme ?? "system") === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => setTheme(o.value)}
                  aria-pressed={active}
                  className={cn(pill(active), "inline-flex items-center gap-1.5")}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className={section}>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Camera className="h-4 w-4" /> Instagram
          </h3>
          <div className="mt-3 space-y-3">
            {ig === null ? (
              <p className="text-sm text-zinc-500">Memeriksa koneksi…</p>
            ) : !ig.instagram ? (
              <p className="text-sm text-zinc-500">
                Belum terhubung — isi <code>IG_USER_ID</code> / <code>IG_PAGE_ACCESS_TOKEN</code> di env server.
              </p>
            ) : (
              <>
                <p className="flex items-start gap-2 text-sm text-brand-800 dark:text-brand-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Terhubung
                  {ig.userId ? ` (${ig.userId})` : ""}.
                  {ig.quota?.quota_total !== undefined && (
                    <> Kuota publish: {ig.quota.quota_usage ?? "?"} / {ig.quota.quota_total} per 24 jam.</>
                  )}
                </p>
                {ig.error && <p className="text-xs text-amber-600 dark:text-amber-400">{ig.error}</p>}
                {ig.token && (
                  <p className="text-xs text-zinc-500">
                    Token {ig.token.autoRefresh ? "auto-refresh aktif" : "manual"}
                    {ig.token.daysLeft !== undefined && ig.token.daysLeft !== null
                      ? ` — sisa ${ig.token.daysLeft} hari${ig.token.daysLeft < 0 ? ", segera tempel token baru" : ""}.`
                      : " — umur tak diketahui."}
                  </p>
                )}
                {syncMsg && <p className="text-xs text-zinc-500">{syncMsg}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={pillGlass} onClick={syncNow} disabled={syncing || pubbing}>
                    <RefreshCw className="h-4 w-4" /> {syncing ? "Menyinkronkan…" : "Sync postingan sekarang"}
                  </button>
                  <button type="button" className={pillGlass} onClick={publishDueNow} disabled={pubbing || syncing}>
                    <Send className="h-4 w-4" /> {pubbing ? "Menerbitkan…" : "Publish due sekarang"}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
