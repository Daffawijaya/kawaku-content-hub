"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { CheckCircle2, Camera, Monitor, Moon, RefreshCw, Sun } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { categories, memberRoles, typeMeta, type ContentType } from "@/lib/mock";
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "@/lib/settings-store";

const input =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";
const label = "mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300";

function Switch({ checked, onChange, label: ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 shrink-0 rounded-full transition-colors",
        checked ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-700"
      )}
      style={{ height: 22 }}
    >
      <span
        className={cn(
          "absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all",
          checked ? "left-[22px]" : "left-[3px]"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [ig, setIg] = useState<{
    instagram: boolean;
    userId?: string;
    quota?: { quota_total?: number; quota_usage?: number };
    token?: { expiresAt?: string | null; daysLeft?: number | null; autoRefresh?: boolean };
    error?: string;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
    fetch("/api/instagram/status")
      .then((r) => r.json())
      .then(setIg)
      .catch(() => setIg({ instagram: false }));
  }, []);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
  }, [saved]);

  function patch(p: Partial<AppSettings>) {
    setSettings((s) => ({ ...s, ...p }));
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
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

  const initials = settings.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const notifRows = [
    { key: "review" as const, title: "Stok & jadwal", desc: "Kabar konten baru dan perubahan jadwal." },
    { key: "reminder" as const, title: "Schedule reminder", desc: "Pengingat sebelum jadwal publikasi." },
    { key: "status" as const, title: "Status updates", desc: "Kabar perubahan status konten tim." },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Settings"
        description="Profil, tampilan, notifikasi, dan preferensi konten."
      />

      {saved && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Pengaturan tersimpan di perangkat ini.
        </p>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <div className="space-y-4 px-5 pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                {initials || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{settings.name || "Nama belum diisi"}</p>
                <p className="truncate text-xs text-zinc-500">{settings.email} • {settings.role}</p>
              </div>
            </div>
            <div>
              <label className={label} htmlFor="st-name">Nama</label>
              <input
                id="st-name"
                value={settings.name}
                onChange={(e) => patch({ name: e.target.value })}
                className={input}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="st-email">Email</label>
                <input
                  id="st-email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  className={input}
                  placeholder="nama@kawaku.id"
                />
              </div>
              <div>
                <label className={label} htmlFor="st-role">Role</label>
                <select id="st-role" value={settings.role} onChange={(e) => patch({ role: e.target.value })} className={input}>
                  {memberRoles.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-3 gap-2 px-5 pb-5">
            {[
              { value: "light" as const, label: "Light", icon: Sun },
              { value: "dark" as const, label: "Dark", icon: Moon },
              { value: "system" as const, label: "System", icon: Monitor },
            ].map((o) => {
              const Icon = o.icon;
              const active = (theme ?? "system") === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => setTheme(o.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-colors",
                    active
                      ? "border-brand-500 bg-brand-50/60 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <div className="space-y-4 px-5 pb-5">
            {notifRows.map((n) => (
              <div key={n.key} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-zinc-500">{n.desc}</p>
                </div>
                <Switch
                  label={n.title}
                  checked={settings.notif[n.key]}
                  onChange={(v) => patch({ notif: { ...settings.notif, [n.key]: v } })}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Preferences</CardTitle>
          </CardHeader>
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="st-type">Default type</label>
              <select
                id="st-type"
                value={settings.prefs.defaultType}
                onChange={(e) => patch({ prefs: { ...settings.prefs, defaultType: e.target.value as ContentType } })}
                className={input}
              >
                {(Object.keys(typeMeta) as ContentType[]).map((t) => (
                  <option key={t} value={t}>{typeMeta[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="st-cat">Default category</label>
              <select
                id="st-cat"
                value={settings.prefs.defaultCategory}
                onChange={(e) => patch({ prefs: { ...settings.prefs, defaultCategory: e.target.value } })}
                className={input}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="st-time">Reminder time</label>
              <input
                id="st-time"
                type="time"
                value={settings.prefs.reminderTime}
                onChange={(e) => patch({ prefs: { ...settings.prefs, reminderTime: e.target.value } })}
                className={input}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> Instagram
            </CardTitle>
          </CardHeader>
          <div className="space-y-3 px-5 pb-5">
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
                      ? ` — sisa ${ig.token.daysLeft} hari${ig.token.daysLeft < 0 ? ", segera tempel token fresh baru" : ""}.`
                      : " — umur tak diketahui."}
                  </p>
                )}
                {syncMsg && <p className="text-xs text-zinc-500">{syncMsg}</p>}
                <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}>
                  <RefreshCw className="h-4 w-4" /> {syncing ? "Sync…" : "Sync postingan sekarang"}
                </Button>
              </>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSettings(defaultSettings);
              saveSettings(defaultSettings);
              setSaved(true);
            }}
          >
            Reset
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
