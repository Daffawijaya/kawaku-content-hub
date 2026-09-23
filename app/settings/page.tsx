"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { CheckCircle2, Camera, Monitor, Moon, RefreshCw, Send, Sun, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { pillGlass, pillWhite } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal";
import { AvatarPhoto } from "@/components/ui/avatar";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { isAdminOrAbove } from "@/lib/roles";
import { deleteMyAvatar, notifyAvatarUpdated, uploadMyAvatar } from "@/lib/profile-avatar";
import { getBrowserClient } from "@/lib/supabase/client";

// Section flat ala analytics: divider rambut antar grup, tanpa Card.
const section = "mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-800";
// Input standar aplikasi (sama persis dgn form modal).
const input =
  "w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-[#4c4c4c] dark:text-zinc-100";
const label = "mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300";
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
    avatarUrl: string | null;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
  const [favTags, setFavTags] = useState<{ username: string; display_name: string | null }[]>([]);
  const [favInput, setFavInput] = useState("");
  const [favMsg, setFavMsg] = useState<string | null>(null);
  const [favSaving, setFavSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  // Jabatan tim milik sendiri — tampil saja, diganti admin via /team.
  const [savedTeamRole, setSavedTeamRole] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState("");

  useEffect(() => {
    const supabase = getBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(async ({ data }) => {
        const user = data.user;
        if (!user) return;
        setUserId(user.id);
        const { data: row } = await supabase
          .from("profiles")
          .select("name, email, role, initials, avatar_url")
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
          role: (row?.role as string | undefined) ?? "admin",
          initials:
            (row?.initials as string | undefined) ||
            name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase(),
          avatarUrl: (row?.avatar_url as string | undefined) ?? null,
        });
        setEditName(name);
      });
    }
    fetch("/api/instagram/status")
      .then((r) => r.json())
      .then(setIg)
      .catch(() => setIg({ instagram: false }));
    // Baris anggota tim milik sendiri (untuk jabatan yg bisa diganti).
    fetch("/api/team/me")
      .then((r) => r.json())
      .then((j: { member?: { role?: string } | null }) => {
        if (j?.member?.role) setSavedTeamRole(j.member.role);
      })
      .catch(() => undefined);
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

  // Simpan nama akun (+ sinkron ke baris tim sendiri).
  async function saveAccount() {
    const supabase = getBrowserClient();
    if (!supabase || !userId) {
      setAccountMsg("Supabase belum dikonfigurasi.");
      return;
    }
    const name = editName.trim();
    if (!name) {
      setAccountMsg("Nama wajib diisi.");
      return;
    }
    setSavingAccount(true);
    setAccountMsg(null);
    try {
      const initials = name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ name, initials })
        .eq("id", userId);
      if (profileErr) throw new Error(profileErr.message);
      await supabase.auth.updateUser({ data: { full_name: name } });
      const res = await fetch("/api/team/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        // 404 = akun tak tertaut tim: wajar, nama profil tetap tersimpan.
        if (res.status !== 404) throw new Error(json?.error ?? "Gagal sinkron nama tim.");
      }
      setProfile((p) => (p ? { ...p, name, initials } : p));
      setAccountMsg("Nama tersimpan.");
      setTimeout(() => {
        setAccountOpen(false);
        setAccountMsg(null);
      }, 900);
    } catch (e) {
      setAccountMsg(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSavingAccount(false);
    }
  }

  // Ganti password (lama diverifikasi via login ulang).
  async function savePassword() {
    const supabase = getBrowserClient();
    if (!supabase || !userId) {
      setPasswordMsg("Supabase belum dikonfigurasi.");
      return;
    }
    if (!oldPassword) {
      setPasswordMsg("Isi password lama untuk mengganti password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Password baru min. 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Ulangi password tidak cocok.");
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const email = profile?.email ?? "";
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (verifyErr) throw new Error("Password lama salah.");
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) throw new Error(pwErr.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password diganti.");
      setTimeout(() => {
        setPasswordOpen(false);
        setPasswordMsg(null);
      }, 900);
    } catch (e) {
      setPasswordMsg(e instanceof Error ? e.message : "Gagal mengganti password.");
    } finally {
      setSavingPassword(false);
    }
  }

  function openEditAccount() {
    setEditName(profile?.name ?? "");
    setAccountMsg(null);
    setAccountOpen(true);
  }

  function openChangePassword() {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg(null);
    setPasswordOpen(true);
  }

  async function changeAvatar(file: File | undefined) {
    if (!file || !userId || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadMyAvatar(file, userId, profile?.avatarUrl);
      setProfile((p) => (p ? { ...p, avatarUrl: url } : p));
      notifyAvatarUpdated();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Ganti foto gagal.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeAvatar() {
    if (!userId || !profile?.avatarUrl || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      await deleteMyAvatar(userId, profile.avatarUrl);
      setProfile((p) => (p ? { ...p, avatarUrl: null } : p));
      notifyAvatarUpdated();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Hapus foto gagal.");
    } finally {
      setUploading(false);
    }
  }

  // Tag favorit tim (admin + superadmin) — saran teratas di form konten.
  useEffect(() => {
    if (!isAdminOrAbove(profile?.role)) return;
    fetch("/api/instagram/tags/favorites")
      .then((r) => r.json())
      .then((j: { favorites?: { username: string; display_name: string | null }[] } | null) => {
        if (j?.favorites) setFavTags(j.favorites);
      })
      .catch(() => undefined);
  }, [profile?.role]);

  async function addFavTag() {
    const u = favInput.trim().replace(/^@+/, "").toLowerCase();
    if (!u || favSaving) return;
    if (!/^[a-z0-9._]{1,30}$/.test(u)) {
      setFavMsg("Username IG hanya huruf, angka, titik, underscore (maks 30).");
      return;
    }
    setFavSaving(true);
    setFavMsg(null);
    try {
      const res = await fetch("/api/instagram/tags/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Gagal menambah favorit.");
      setFavTags((prev) => (prev.some((x) => x.username === u) ? prev : [...prev, { username: u, display_name: null }]));
      setFavInput("");
    } catch (e) {
      setFavMsg(e instanceof Error ? e.message : "Gagal menambah favorit.");
    } finally {
      setFavSaving(false);
    }
  }

  async function delFavTag(username: string) {
    setFavTags((prev) => prev.filter((x) => x.username !== username));
    try {
      await fetch(`/api/instagram/tags/favorites?username=${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
    } catch {
      /* daftar lokal tetap terhapus */
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
            <div className="mt-3 flex items-center gap-4">
              <Dropdown
                width="w-40"
                align="left"
                portal
                trigger={() => (
                  <span
                    title="Foto profil"
                    className="group relative block h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-full"
                  >
                    <AvatarPhoto
                      name={profile.name}
                      fallback={profile.initials || "?"}
                      url={profile.avatarUrl}
                      className="h-full w-full bg-brand-600 text-2xl font-bold text-white"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100"
                    >
                      <Camera className="h-6 w-6" />
                    </span>
                  </span>
                )}
              >
                <DropdownItem icon={<Camera className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>
                  Unggah Foto
                </DropdownItem>
                {profile.avatarUrl && (
                  <DropdownItem icon={<Trash2 className="h-3.5 w-3.5" />} danger onClick={() => void removeAvatar()}>
                    Hapus Foto
                  </DropdownItem>
                )}
              </Dropdown>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                aria-label="Ganti foto profil"
                disabled={uploading}
                className="hidden"
                onChange={(e) => void changeAvatar(e.target.files?.[0])}
              />
              <div className="min-w-0">
                <p className="truncate text-xl font-bold tracking-tight sm:text-2xl">{profile.name}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {profile.email} • {profile.role}{savedTeamRole && savedTeamRole !== profile.role ? ` • ${savedTeamRole}` : ""}
                </p>
                {uploading && <p className="text-xs text-zinc-500">Mengunggah…</p>}
                {uploadError && <p className="text-xs text-rose-600 dark:text-rose-400">{uploadError}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={openEditAccount} className={pillGlass}>
                    Edit akun
                  </button>
                  <button type="button" onClick={openChangePassword} className={pillGlass}>
                    Ganti password
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Memuat profil…</p>
          )}
        </section>

        {/* Modal edit akun (nama saja) */}
        <ModalShell
          open={accountOpen}
          label="Edit akun"
          title="Edit akun"
          size="sm"
          onClose={() => setAccountOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setAccountOpen(false)} className={pillGlass}>Batal</button>
              <button type="button" onClick={saveAccount} disabled={savingAccount} className={pillWhite}>
                {savingAccount ? "Menyimpan…" : "Simpan"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              {profile && (
                <Dropdown
                  width="w-40"
                  align="center"
                  portal
                  trigger={() => (
                    <span
                      title="Foto profil"
                      className="group relative block h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full"
                    >
                      <AvatarPhoto
                        name={profile.name}
                        fallback={profile.initials || "?"}
                        url={profile.avatarUrl}
                        className="h-full w-full bg-brand-600 text-xl font-bold text-white"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/50 group-hover:opacity-100"
                      >
                        <Camera className="h-5 w-5" />
                      </span>
                    </span>
                  )}
                >
                  <DropdownItem icon={<Camera className="h-3.5 w-3.5" />} onClick={() => fileRef.current?.click()}>
                    Unggah Foto
                  </DropdownItem>
                  {profile.avatarUrl && (
                    <DropdownItem icon={<Trash2 className="h-3.5 w-3.5" />} danger onClick={() => void removeAvatar()}>
                      Hapus Foto
                    </DropdownItem>
                  )}
                </Dropdown>
              )}
              {uploading && <p className="mt-2 text-xs text-zinc-500">Mengunggah…</p>}
              {uploadError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{uploadError}</p>}
            </div>
            <div>
              <label className={label} htmlFor="stg-name">Nama</label>
              <input
                id="stg-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className={input}
                placeholder="Nama tampilan"
              />
            </div>
            {accountMsg && <p className="text-xs text-zinc-500">{accountMsg}</p>}
          </div>
        </ModalShell>

        {/* Modal ganti password */}
        <ModalShell
          open={passwordOpen}
          label="Ganti password"
          title="Ganti password"
          size="sm"
          onClose={() => setPasswordOpen(false)}
          footer={
            <>
              <button type="button" onClick={() => setPasswordOpen(false)} className={pillGlass}>Batal</button>
              <button type="button" onClick={savePassword} disabled={savingPassword} className={pillWhite}>
                {savingPassword ? "Menyimpan…" : "Simpan"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={label} htmlFor="stg-old-password">Password lama</label>
              <input
                id="stg-old-password"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={input}
                placeholder="Ketik password lama kamu"
              />
            </div>
            <div>
              <label className={label} htmlFor="stg-password">Password baru</label>
              <input
                id="stg-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={input}
                placeholder="Buat password baru, min. 6 karakter"
              />
            </div>
            <div>
              <input
                id="stg-confirm-password"
                type="password"
                autoComplete="new-password"
                aria-label="Ulangi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={input}
                placeholder="Ketik ulang password barunya"
              />
            </div>
            {passwordMsg && <p className="text-xs text-zinc-500">{passwordMsg}</p>}
          </div>
        </ModalShell>

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

        {/* Instagram khusus admin + superadmin */}
        {isAdminOrAbove(profile?.role) && (
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
                  {/* Sync manual khusus admin + superadmin */}
                  {isAdminOrAbove(profile?.role) && (
                    <button type="button" className={pillGlass} onClick={syncNow} disabled={syncing || pubbing}>
                      <RefreshCw className="h-4 w-4" /> {syncing ? "Menyinkronkan…" : "Sync postingan sekarang"}
                    </button>
                  )}
                  {/* Publish manual khusus admin + superadmin */}
                  {isAdminOrAbove(profile?.role) && (
                    <button type="button" className={pillGlass} onClick={publishDueNow} disabled={pubbing || syncing}>
                      <Send className="h-4 w-4" /> {pubbing ? "Menerbitkan…" : "Publish due sekarang"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
        )}

        {/* Tag favorit tim khusus admin + superadmin — saran teratas di form konten */}
        {isAdminOrAbove(profile?.role) && (
        <section className={section}>
          <h3 className="text-sm font-semibold">Tag favorit tim</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Isi sekali username yang sering di-tag — muncul paling atas saat mengetik di form konten.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={favInput}
              onChange={(e) => setFavInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addFavTag();
                }
              }}
              className={input}
              placeholder="@username"
              autoComplete="off"
            />
            <button type="button" onClick={() => void addFavTag()} disabled={favSaving} className={pillGlass}>
              {favSaving ? "Menyimpan…" : "Tambah"}
            </button>
          </div>
          {favMsg && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{favMsg}</p>}
          {favTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {favTags.map((t) => (
                <span
                  key={t.username}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  @{t.username}
                  <button
                    type="button"
                    aria-label={`Hapus ${t.username} dari favorit`}
                    onClick={() => void delFavTag(t.username)}
                    className="rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
