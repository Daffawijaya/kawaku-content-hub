"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Search, X } from "lucide-react";
import { Badge, RoleBadge } from "@/components/ui/badge";
import { Button, pillGlass, pillWhite } from "@/components/ui/button";
import { DeleteConfirmBody, DeleteConfirmFooter, type DeletePhase } from "@/components/ui/delete-confirm";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { ModalShell } from "@/components/ui/modal";
import { cn } from "@/lib/utils";import {
  memberRoles,
  type ManagedContent,
  type TeamMember,
} from "@/lib/mock";
import { listContents } from "@/lib/content-db";
import {
  createTeamMemberWithAccount,
  deleteTeamMemberWithAccount,
  initialsOf,
  listTeamMembers,
  resetMemberPassword,
  updateMemberAccessRole,
  updateTeamMember,
  usesTeamDb,
} from "@/lib/team-db";
import { useMyRole } from "@/lib/use-my-role";
import { canManageTeam } from "@/lib/roles";

// Pill filter ala board/kalender/media (rounded-lg, bukan rounded-full).
const pill = (active: boolean) =>
  active
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white min-h-[36px] sm:min-h-0 dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 min-h-[36px] sm:min-h-0 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

const input =
  "w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 sm:text-sm dark:border-[#4c4c4c] dark:text-zinc-100";
const inputError = "border-rose-400 focus:border-rose-500";
const label = "mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300";
const errText = "mt-1 text-xs text-rose-600 dark:text-rose-400";

function Avatar({ name, initials, size = "md" }: { name: string; initials: string; size?: "md" | "lg" }) {
  return (
    <span
      title={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300",
        size === "md" ? "h-9 w-9 text-xs" : "h-14 w-14 text-lg"
      )}
    >
      {initials}
    </span>
  );
}

type FormState = { name: string; role: string; email: string; active: boolean; password: string; accessRole: "superadmin" | "admin" };

export function TeamManager({ addOpen, onCloseAdd }: { addOpen: boolean; onCloseAdd: () => void }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", role: memberRoles[0], email: "", active: true, password: "", accessRole: "admin" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deletePhase, setDeletePhase] = useState<DeletePhase>("confirm");
  // Reset password langsung dari modal detail (khusus superadmin).
  const [pwOpen, setPwOpen] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  // Ganti jabatan langsung dari modal detail (khusus superadmin).
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleMsg, setRoleMsg] = useState<string | null>(null);

  // Gate UI berbasis role (penegakan nyata di RLS + API):
  // superadmin = penuh + kelola tim; admin = read-only untuk halaman Tim.
  // Mode mock (tanpa DB): akses penuh seperti sebelumnya.
  const { role: myRole, loading: roleLoading } = useMyRole();
  const mock = !usesTeamDb();
  const isSuperadmin = mock || (!roleLoading && canManageTeam(myRole));
  const canEditTeam = isSuperadmin;
  const [contents, setContents] = useState<ManagedContent[]>([]);

  useEffect(() => {
    if (!usesTeamDb()) return;
    listTeamMembers().then(setMembers).catch(() => undefined);
    listContents().then(setContents).catch(() => undefined);
  }, []);

  const roles = useMemo(() => [...new Set(members.map((m) => m.role))], [members]);
  const countBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contents) {
      for (const p of c.pic.split(",").map((s) => s.trim()).filter(Boolean)) {
        m.set(p, (m.get(p) ?? 0) + 1);
      }
    }
    return m;
  }, [contents]);
  const filtered = members.filter((m) => {
    if (role !== "all" && m.role !== role) return false;
    if (status !== "all" && (m.active ? "active" : "inactive") !== status) return false;
    const q = query.trim().toLowerCase();
    if (q && !`${m.name} ${m.email} ${m.role}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const detail = detailId ? members.find((m) => m.id === detailId) ?? null : null;
  // Modal tambah/ubah hanya untuk superadmin (sekalian buat akun login role admin).
  const formOpen = (addOpen && canEditTeam) || (editing !== null && canEditTeam);

  useEffect(() => {
    if (addOpen) {
      setEditing(null);
      setForm({ name: "", role: memberRoles[0], email: "", active: true, password: "", accessRole: "admin" });
      setErrors({});
    }
  }, [addOpen]);

  // Ganti target detail → form reset password + jabatan ikut di-reset.
  useEffect(() => {
    setPwOpen(false);
    setPw1("");
    setPw2("");
    setPwMsg(null);
    setRoleMsg(null);
  }, [detailId]);

  function openEdit(m: TeamMember) {
    if (!canEditTeam) return;
    setEditing(m);
    setForm({ name: m.name, role: m.role, email: m.email, active: m.active, password: "", accessRole: m.accessRole ?? "admin" });
    setErrors({});
    onCloseAdd();
  }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi.";
    if (!form.email.trim()) e.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Format email tidak valid.";
    // Tambah: akun login selalu dibuat → password wajib.
    // Ubah: password opsional, hanya untuk ganti password akun yg tertaut.
    if (!editing && usesTeamDb()) {
      if (!form.password) e.password = "Password wajib diisi untuk akun login.";
      else if (form.password.length < 6) e.password = "Password min. 6 karakter.";
    } else if (editing && form.password && form.password.length < 6) {
      e.password = "Password min. 6 karakter.";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const input = {
      name: form.name.trim(),
      role: form.role,
      email: form.email.trim(),
      active: form.active,
    };
    if (!usesTeamDb()) {
      if (editing) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === editing.id
              ? { ...m, ...input, initials: initialsOf(input.name) }
              : m
          )
        );
        setDetailId(editing.id);
        setEditing(null);
      } else {
        setMembers((prev) => [
          ...prev,
          { id: `t-${Date.now()}`, ...input, initials: initialsOf(input.name), joinedAt: new Date().toISOString().slice(0, 10), hasAccount: false },
        ]);
        onCloseAdd();
      }
      return;
    }
    try {
      if (editing) {
        if (!canEditTeam) return;
        const updated = await updateTeamMember(editing.id, input);
        if (form.password) await resetMemberPassword(editing.id, form.password);
        if (editing.hasAccount && form.accessRole !== (editing.accessRole ?? "admin")) {
          await updateMemberAccessRole(editing.id, form.accessRole);
          updated.accessRole = form.accessRole;
        }
        setMembers((prev) => prev.map((m) => (m.id === editing.id ? updated : m)));
        setDetailId(editing.id);
        setEditing(null);
      } else {
        const created = await createTeamMemberWithAccount({ ...input, password: form.password });
        setMembers((prev) => [...prev, created]);
        onCloseAdd();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menyimpan anggota.");
    }
  }

  async function handleResetPassword() {
    if (!detail || !canEditTeam) return;
    if (pw1.length < 6) {
      setPwMsg("Password min. 6 karakter.");
      return;
    }
    if (pw1 !== pw2) {
      setPwMsg("Konfirmasi password tidak sama.");
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await resetMemberPassword(detail.id, pw1);
      setPw1("");
      setPw2("");
      setPwOpen(false);
      setNotice(`Password “${detail.name}” berhasil diganti.`);
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : "Gagal mengganti password.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleChangeJabatan(next: string) {
    if (!detail || !canEditTeam || next === detail.role) return;
    setRoleSaving(true);
    setRoleMsg(null);
    try {
      const updated = await updateTeamMember(detail.id, {
        name: detail.name,
        role: next,
        email: detail.email,
        active: detail.active,
      });
      setMembers((prev) => prev.map((m) => (m.id === detail.id ? updated : m)));
    } catch (err) {
      setRoleMsg(err instanceof Error ? err.message : "Gagal mengganti jabatan.");
    } finally {
      setRoleSaving(false);
    }
  }

  async function toggleActive(id: string) {
    if (!canEditTeam) return;
    const m = members.find((x) => x.id === id);
    if (!m) return;
    if (!usesTeamDb()) {
      setMembers((prev) => prev.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
      return;
    }
    try {
      const updated = await updateTeamMember(id, {
        name: m.name,
        role: m.role,
        email: m.email,
        active: !m.active,
      });
      setMembers((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  function closeForm() {
    setEditing(null);
    onCloseAdd();
  }

  function openDelete(m: TeamMember) {
    if (!canEditTeam) return;
    setDeleteTarget(m);
    setDeletePhase("confirm");
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeletePhase("confirm");
  }

  async function confirmDelete() {
    if (!deleteTarget || deletePhase !== "confirm") return;
    setDeletePhase("deleting");
    try {
      const { accountDeleted } = await deleteTeamMemberWithAccount(deleteTarget.id);
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      if (detailId === deleteTarget.id) setDetailId(null);
      setNotice(
        accountDeleted
          ? `“${deleteTarget.name}” dihapus beserta akun loginnya.`
          : `“${deleteTarget.name}” dihapus (tidak ada akun login yg tertaut).`
      );
      setDeletePhase("done");
      setTimeout(closeDelete, 900);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menghapus anggota.");
      setDeletePhase("confirm");
    }
  }

  return (
    <div>
      {/* Filters: ritme antar-blok mb-4 ala kalender. Mobile: pills scroll satu baris. */}
      <div>
        <div className="mb-4 flex min-h-[44px] items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 sm:w-64 sm:min-h-0 dark:border-zinc-800 dark:bg-zinc-950">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, peran…"
            aria-label="Cari anggota tim"
            className="w-full bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 sm:text-sm dark:text-zinc-100"
          />
          {query && (
            <button aria-label="Bersihkan pencarian" onClick={() => setQuery("")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full sm:h-auto sm:w-auto">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="-mx-4 mb-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
          <button onClick={() => setRole("all")} className={cn(pill(role === "all"), "shrink-0 sm:shrink")}>Semua peran</button>
          {roles.map((r) => (
            <button key={r} onClick={() => setRole(role === r ? "all" : r)} className={cn(pill(role === r), "shrink-0 sm:shrink")}>
              {r}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px shrink-0 self-center bg-zinc-200 sm:block dark:bg-zinc-800" />
          {(["all", "active", "inactive"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={cn(pill(status === s), "shrink-0 sm:shrink")}>
              {s === "all" ? "Semua status" : s === "active" ? "Aktif" : "Nonaktif"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {notice && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {notice}
        </p>
      )}
      {filtered.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium">Tidak ada anggota yang cocok</p>
          <p className="mt-1 text-xs text-zinc-500">Coba ubah kata kunci atau filter.</p>
        </div>
      ) : (
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <button key={m.id} onClick={() => setDetailId(m.id)} className="group text-left">
              <span className="relative block rounded-lg">
                <span
                  aria-hidden
                  className="absolute -inset-2 scale-[0.97] rounded-xl bg-zinc-900/[0.07] opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 dark:bg-white/10"
                />
                <span className="relative block">
                  <span className="flex items-center gap-3">
                    <Avatar name={m.name} initials={m.initials} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-semibold", !m.active && "opacity-70")}>{m.name}</span>
                      <span className="block truncate text-xs text-zinc-500">{m.email}</span>
                    </span>
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", m.active ? "bg-brand-500" : "bg-zinc-300 dark:bg-zinc-600")} title={m.active ? "Aktif" : "Nonaktif"} />
                  </span>
                  <span className="mt-2.5 flex items-center justify-between gap-2">
                    <RoleBadge role={m.role} />
                    <span className="text-xs text-zinc-500">{countBy.get(m.name) ?? 0} konten</span>
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal (cangkang ModalShell, sama seperti modal lain) */}
      <ModalShell
        open={detail !== null}
        label={detail?.name ?? "Detail anggota"}
        title={detail?.name ?? "Detail anggota"}
        size="sm"
        onClose={() => setDetailId(null)}
        footer={
          detail && canEditTeam ? (
            <>
              <button
                type="button"
                onClick={() => openDelete(detail)}
                className="mr-auto inline-flex h-9 min-h-[44px] items-center rounded-full px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 sm:min-h-0 dark:text-rose-400 dark:hover:bg-rose-950"
              >
                Hapus
              </button>
              <Button variant="outline" size="sm" onClick={() => toggleActive(detail.id)} className="min-h-[44px] sm:min-h-0">
                {detail.active ? "Nonaktifkan" : "Aktifkan"}
              </Button>
              <button type="button" onClick={() => openEdit(detail)} className={cn(pillWhite, "min-h-[44px] sm:min-h-0")}>
                <Pencil className="h-3.5 w-3.5" /> Ubah
              </button>
            </>
          ) : null
        }
      >
        {detail && (
          <>
            <div className="flex items-center gap-3">
              <Avatar name={detail.name} initials={detail.initials} size="lg" />
              <p className="text-xs text-zinc-500">{detail.email}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {canEditTeam ? (
                <Dropdown
                  align="left"
                  width="w-52"
                  portal
                  trigger={(open) => (
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={open}
                      disabled={roleSaving}
                      className={cn(input, "flex w-auto items-center justify-between gap-2 py-1.5 text-left text-xs disabled:opacity-60")}
                    >
                      <span className="truncate">{roleSaving ? "Menyimpan…" : detail.role}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-300", open && "rotate-180")} />
                    </button>
                  )}
                >
                  {memberRoles.map((r) => (
                    <DropdownItem
                      key={r}
                      selected={detail.role === r}
                      onClick={() => void handleChangeJabatan(r)}
                    >
                      {r}
                    </DropdownItem>
                  ))}
                </Dropdown>
              ) : (
                <RoleBadge role={detail.role} />
              )}
              {roleMsg && <p className={cn(errText, "w-full")}>{roleMsg}</p>}
              <Badge className={detail.active ? "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : ""}>
                {detail.active ? "Aktif" : "Nonaktif"}
              </Badge>
              <span className="text-xs text-zinc-500">• {countBy.get(detail.name) ?? 0} konten</span>
            </div>
            {canEditTeam && detail.hasAccount && (
              <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPwOpen((v) => !v)}
                  aria-expanded={pwOpen}
                  className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium sm:min-h-0"
                >
                  Reset password
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-300", pwOpen && "rotate-180")} />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    pwOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      className={cn(
                        "space-y-3 border-t px-3 transition-all duration-300",
                        pwOpen
                          ? "border-zinc-200 py-3 dark:border-zinc-800"
                          : "border-transparent py-0"
                      )}
                    >
                      <div>
                        <label className={label} htmlFor="tm-reset-pw1">Password baru</label>
                        <input
                          id="tm-reset-pw1"
                          type="password"
                          autoComplete="new-password"
                          value={pw1}
                          onChange={(e) => setPw1(e.target.value)}
                          className={input}
                          placeholder="Min. 6 karakter"
                          tabIndex={pwOpen ? 0 : -1}
                        />
                      </div>
                      <div>
                        <label className={label} htmlFor="tm-reset-pw2">Ulangi password baru</label>
                        <input
                          id="tm-reset-pw2"
                          type="password"
                          autoComplete="new-password"
                          value={pw2}
                          onChange={(e) => setPw2(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleResetPassword();
                            }
                          }}
                          className={input}
                          placeholder="Ketik ulang password barunya"
                          tabIndex={pwOpen ? 0 : -1}
                        />
                      </div>
                      {pwMsg && <p className={errText}>{pwMsg}</p>}
                      <button
                        type="button"
                        onClick={() => void handleResetPassword()}
                        disabled={pwSaving}
                        className={cn(pillWhite, "min-h-[44px] sm:min-h-0")}
                        tabIndex={pwOpen ? 0 : -1}
                      >
                        {pwSaving ? "Menyimpan…" : "Simpan password"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </ModalShell>

      {/* Konfirmasi hapus anggota + akun login (khusus admin via API) */}
      <ModalShell
        open={deleteTarget !== null}
        label="Hapus Anggota"
        title="Hapus Anggota"
        size="sm"
        onClose={closeDelete}
        footer={
          deletePhase === "confirm" ? (
            <DeleteConfirmFooter phase={deletePhase} onCancel={closeDelete} onConfirm={confirmDelete} />
          ) : null
        }
      >
        {deleteTarget && (
          <DeleteConfirmBody
            phase={deletePhase}
            name={deleteTarget.name}
            scope="Anggota"
            extraConfirm={
              deleteTarget.hasAccount ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Akun login yg tertaut ikut dihapus dan tidak bisa dikembalikan.
                </p>
              ) : undefined
            }
          />
        )}
      </ModalShell>

      {/* Add/Edit modal (cangkang ModalShell, sama seperti modal lain) */}
      <ModalShell
        open={formOpen}
        label={editing ? "Ubah Anggota" : "Tambah Anggota"}
        title={editing ? "Ubah Anggota" : "Tambah Anggota"}
        size="sm"
        onClose={closeForm}
        footer={
          <>
            <button type="button" onClick={closeForm} className={`${pillGlass} min-h-[44px] sm:min-h-0`}>Batal</button>
            <button type="button" onClick={handleSave} className={`${pillWhite} min-h-[44px] sm:min-h-0`}>{editing ? "Simpan" : "Tambah Anggota"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={label} htmlFor="tm-name">Nama *</label>
            <input
              id="tm-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={cn(input, errors.name && inputError)}
              placeholder="cth. Anisa Rahma"
            />
            {errors.name && <p className={errText}>{errors.name}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className={label} id="tm-role-label">Peran</span>
                  <Dropdown
                    align="left"
                    width="w-full"
                    portal
                    trigger={(open) => (
                      <button
                        type="button"
                        aria-labelledby="tm-role-label"
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        className={cn(input, "flex items-center justify-between gap-2 text-left")}
                      >
                        <span className="truncate">{form.role}</span>
                        <ChevronDown className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} />
                      </button>
                    )}
                  >
                    {memberRoles.map((r) => (
                      <DropdownItem
                        key={r}
                        selected={form.role === r}
                        onClick={() => setForm((f) => ({ ...f, role: r }))}
                      >
                        {r}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
            <div>
              <label className={label} htmlFor="tm-email">Email *</label>
              <input
                id="tm-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={cn(input, errors.email && inputError)}
                placeholder="nama@kawaku.id"
              />
              {errors.email && <p className={errText}>{errors.email}</p>}
            </div>
          </div>
          {/* Password/ganti password = kelola akun → khusus superadmin */}
          {isSuperadmin && (
          <div>
            <label className={label} htmlFor="tm-password">
              {editing ? "Ganti password" : "Password *"}
            </label>
            <input
              id="tm-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              disabled={!!editing && !editing.hasAccount}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={cn(input, errors.password && inputError)}
              placeholder={editing ? "Kosongkan bila tidak diganti" : "Min. 6 karakter"}
            />
            {errors.password ? (
              <p className={errText}>{errors.password}</p>
            ) : editing ? (
              <p className="mt-1 text-xs text-zinc-500">
                {editing.hasAccount
                  ? "Diisi hanya untuk mengganti password akun login anggota."
                  : "Anggota ini belum punya akun login."}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-500">
                Akun login role admin dibuat otomatis dengan email di atas.
              </p>
            )}
          </div>
          )}
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Aktif</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="h-4 w-4 accent-brand-600"
            />
          </label>
        </div>
      </ModalShell>
    </div>
  );
}
