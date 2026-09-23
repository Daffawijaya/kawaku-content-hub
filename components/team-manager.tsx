"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Search, X } from "lucide-react";
import { Badge, RoleBadge } from "@/components/ui/badge";
import { Button, pillGlass, pillWhite } from "@/components/ui/button";
import { DeleteConfirmBody, DeleteConfirmFooter, type DeletePhase } from "@/components/ui/delete-confirm";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { ModalShell } from "@/components/ui/modal";
import { StoryModal } from "@/components/story-modal";
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
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

const input =
  "w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-[#4c4c4c] dark:text-zinc-100";
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
  // Story dibuka sebagai modal pratinjau, bukan halaman detail.
  const [storyView, setStoryView] = useState<ManagedContent | null>(null);

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
  const contentOf = useMemo(() => {
    const m = new Map<string, typeof contents>();
    for (const c of contents) {
      for (const p of c.pic.split(",").map((s) => s.trim()).filter(Boolean)) {
        const list = m.get(p) ?? [];
        if (!list.includes(c)) list.push(c);
        m.set(p, list);
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
      {/* Filters: ritme antar-blok mb-4 ala kalender */}
      <div>
        <div className="mb-4 flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 sm:w-64 dark:border-zinc-800 dark:bg-zinc-950">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, peran…"
            className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
          {query && (
            <button aria-label="Bersihkan pencarian" onClick={() => setQuery("")}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button onClick={() => setRole("all")} className={pill(role === "all")}>Semua peran</button>
          {roles.map((r) => (
            <button key={r} onClick={() => setRole(role === r ? "all" : r)} className={pill(role === r)}>
              {r}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px self-center bg-zinc-200 sm:block dark:bg-zinc-800" />
          {(["all", "active", "inactive"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={pill(status === s)}>
              {s === "all" ? "Semua status" : s === "active" ? "Aktif" : "Nonaktif"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {!mock && !roleLoading && !canEditTeam && (
        <p className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Mode baca — hanya superadmin yang bisa tambah/ubah/nonaktifkan/hapus anggota.
        </p>
      )}
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
                className="mr-auto inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
              >
                Hapus
              </button>
              <Button variant="outline" size="sm" onClick={() => toggleActive(detail.id)}>
                {detail.active ? "Nonaktifkan" : "Aktifkan"}
              </Button>
              <button type="button" onClick={() => openEdit(detail)} className={pillWhite}>
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
              <RoleBadge role={detail.role} />
              <Badge className={detail.active ? "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : ""}>
                {detail.active ? "Aktif" : "Nonaktif"}
              </Badge>
              <span className="text-xs text-zinc-500">• {countBy.get(detail.name) ?? 0} konten ditangani</span>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-zinc-500">Konten ditangani</p>
              {(contentOf.get(detail.name) ?? []).length === 0 ? (
                <p className="text-xs text-zinc-500">Belum menangani konten.</p>
              ) : (
                <ul className="space-y-1.5">
                  {(contentOf.get(detail.name) ?? []).map((c) => (
                    <li key={c.id}>
                      {c.type === "story" ? (
                        <button
                          type="button"
                          onClick={() => setStoryView(c)}
                          className="block w-full truncate rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                        >
                          {c.title}
                        </button>
                      ) : (
                        <Link
                          href={`/content/${c.id}`}
                          className="block truncate rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                        >
                          {c.title}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
            <button type="button" onClick={closeForm} className={pillGlass}>Batal</button>
            <button type="button" onClick={handleSave} className={pillWhite}>{editing ? "Simpan" : "Tambah Anggota"}</button>
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
      <StoryModal
        open={storyView !== null}
        onClose={() => setStoryView(null)}
        date={storyView?.scheduledDate ?? ""}
        igMediaId={storyView?.igMediaId}
      />
    </div>
  );
}
