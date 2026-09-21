// Lapisan data tim: Supabase only.
// Bentuk data selalu TeamMember (lib/mock) agar UI tidak berubah.
import { getBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import type { DbTeamMember } from "./supabase/types";
import type { TeamMember } from "./mock";

export function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toMember(r: DbTeamMember): TeamMember {
  return {
    id: r.id,
    name: r.name,
    initials: r.initials || initialsOf(r.name),
    role: r.role,
    email: r.email,
    active: r.active,
    joinedAt: r.joined_at.slice(0, 10),
    hasAccount: (r.user_id ?? null) !== null,
  };
}

export function usesTeamDb() {
  return isSupabaseConfigured();
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = getBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.from("team_members").select("*").order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbTeamMember[]).map(toMember);
}

// Nama anggota aktif untuk opsi PIC ([] bila gagal — tanpa fallback palsu).
export async function listTeamNames(): Promise<string[]> {
  try {
    return (await listTeamMembers()).filter((m) => m.active).map((m) => m.name);
  } catch {
    return [];
  }
}

export async function createTeamMember(input: {
  name: string;
  role: string;
  email: string;
  active: boolean;
}): Promise<TeamMember> {
  const supabase = getBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      name: input.name,
      initials: initialsOf(input.name),
      role: input.role,
      email: input.email,
      active: input.active,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toMember(data as DbTeamMember);
}

export async function updateTeamMember(
  id: string,
  patch: { name: string; role: string; email: string; active: boolean }
): Promise<TeamMember> {
  const supabase = getBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase
    .from("team_members")
    .update({
      name: patch.name,
      initials: initialsOf(patch.name),
      role: patch.role,
      email: patch.email,
      active: patch.active,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toMember(data as DbTeamMember);
}

// Buat anggota + akun login (role viewer) sekaligus via API server.
// Hanya admin; password min. 6 karakter.
export async function createTeamMemberWithAccount(input: {
  name: string;
  role: string;
  email: string;
  active: boolean;
  password: string;
}): Promise<TeamMember> {
  const res = await fetch("/api/team/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => null)) as { member?: TeamMember; error?: string } | null;
  if (!res.ok) throw new Error(body?.error ?? "Gagal membuat anggota + akun.");
  if (!body?.member) throw new Error("Gagal membuat anggota + akun.");
  return body.member;
}

// Ganti password akun login anggota (hanya admin, hanya yg punya akun).
export async function resetMemberPassword(id: string, password: string): Promise<void> {
  const res = await fetch(`/api/team/${id}/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(body?.error ?? "Gagal mengganti password.");
}
