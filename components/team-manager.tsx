"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  contentLibrary,
  memberRoles,
  teamMembers,
  type ManagedContent,
  type TeamMember,
} from "@/lib/mock";
import { listContents } from "@/lib/content-db";
import {
  createTeamMember,
  initialsOf,
  listTeamMembers,
  updateTeamMember,
  usesTeamDb,
} from "@/lib/team-db";

const pill = (active: boolean) =>
  active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800";

const input =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";
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

type FormState = { name: string; role: string; email: string; active: boolean };

export function TeamManager({ addOpen, onCloseAdd }: { addOpen: boolean; onCloseAdd: () => void }) {
  const [members, setMembers] = useState<TeamMember[]>(teamMembers);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", role: memberRoles[0], email: "", active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [contents, setContents] = useState<ManagedContent[]>(contentLibrary);

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
  const formOpen = addOpen || editing !== null;

  useEffect(() => {
    if (addOpen) {
      setEditing(null);
      setForm({ name: "", role: memberRoles[0], email: "", active: true });
      setErrors({});
    }
  }, [addOpen]);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  function openEdit(m: TeamMember) {
    setEditing(m);
    setForm({ name: m.name, role: m.role, email: m.email, active: m.active });
    setErrors({});
    onCloseAdd();
  }

  async function handleSave() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi.";
    if (!form.email.trim()) e.email = "Email wajib diisi.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Format email tidak valid.";
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
          { id: `t-${Date.now()}`, ...input, initials: initialsOf(input.name), joinedAt: new Date().toISOString().slice(0, 10) },
        ]);
        onCloseAdd();
      }
      return;
    }
    try {
      if (editing) {
        const updated = await updateTeamMember(editing.id, input);
        setMembers((prev) => prev.map((m) => (m.id === editing.id ? updated : m)));
        setDetailId(editing.id);
        setEditing(null);
      } else {
        const created = await createTeamMember(input);
        setMembers((prev) => [...prev, created]);
        onCloseAdd();
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal menyimpan anggota.");
    }
  }

  async function toggleActive(id: string) {
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

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 sm:w-64 dark:border-zinc-800 dark:bg-zinc-950">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nama, email, role…"
            className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setRole("all")} className={pill(role === "all")}>All roles</button>
          {roles.map((r) => (
            <button key={r} onClick={() => setRole(role === r ? "all" : r)} className={pill(role === r)}>
              {r}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px self-center bg-zinc-200 sm:block dark:bg-zinc-800" />
          {(["all", "active", "inactive"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={pill(status === s)}>
              {s === "all" ? "All statuses" : s === "active" ? "Active" : "Inactive"}
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
        <Card className="px-5 py-12 text-center">
          <p className="text-sm font-medium">Tidak ada anggota yang cocok</p>
          <p className="mt-1 text-xs text-zinc-500">Coba ubah kata kunci atau filter.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <button key={m.id} onClick={() => setDetailId(m.id)} className="text-left">
              <Card className={cn("p-4 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700", !m.active && "opacity-70")}>
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} initials={m.initials} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-zinc-500">{m.email}</p>
                  </div>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", m.active ? "bg-brand-500" : "bg-zinc-300 dark:bg-zinc-600")} title={m.active ? "Active" : "Inactive"} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge>{m.role}</Badge>
                  <span className="text-xs text-zinc-500">{countBy.get(m.name) ?? 0} konten</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setDetailId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={detail.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl dark:bg-zinc-950"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Avatar name={detail.name} initials={detail.initials} size="lg" />
                <div>
                  <h3 className="text-base font-semibold">{detail.name}</h3>
                  <p className="text-xs text-zinc-500">{detail.email}</p>
                </div>
              </div>
              <button aria-label="Close detail" onClick={() => setDetailId(null)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge>{detail.role}</Badge>
              <Badge className={detail.active ? "bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : ""}>
                {detail.active ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-zinc-500">• {countBy.get(detail.name) ?? 0} konten ditangani</span>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-zinc-500">Content ditangani</p>
              {(contentOf.get(detail.name) ?? []).length === 0 ? (
                <p className="text-xs text-zinc-500">Belum menangani konten.</p>
              ) : (
                <ul className="space-y-1.5">
                  {(contentOf.get(detail.name) ?? []).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/content/${c.id}`}
                        className="block truncate rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                      >
                        {c.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleActive(detail.id)}>
                {detail.active ? "Set Inactive" : "Set Active"}
              </Button>
              <Button size="sm" onClick={() => openEdit(detail)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={closeForm}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit anggota" : "Tambah anggota"}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl dark:bg-zinc-950"
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-base font-semibold">{editing ? "Edit Anggota" : "Tambah Anggota"}</h3>
              <button aria-label="Close form" onClick={closeForm} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>
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
                  <label className={label} htmlFor="tm-role">Role</label>
                  <select id="tm-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={input}>
                    {memberRoles.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
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
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Active</span>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 accent-brand-600"
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
                <Button onClick={handleSave}>{editing ? "Save Changes" : "Add Member"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
