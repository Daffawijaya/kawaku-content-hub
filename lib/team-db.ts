// Lapisan data tim: Supabase bila dikonfigurasi, fallback ke mock.
// Bentuk data selalu TeamMember (lib/mock) agar UI tidak berubah.
import { getBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import type { DbTeamMember } from "./supabase/types";
import { teamMembers as mockMembers, type TeamMember } from "./mock";

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
  };
}

export function usesTeamDb() {
  return isSupabaseConfigured();
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = getBrowserClient();
  if (!supabase) return mockMembers;
  const { data, error } = await supabase.from("team_members").select("*").order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbTeamMember[]).map(toMember);
}

// Nama anggota aktif untuk opsi PIC (fallback mock bila gagal).
export async function listTeamNames(): Promise<string[]> {
  try {
    return (await listTeamMembers()).filter((m) => m.active).map((m) => m.name);
  } catch {
    return mockMembers.filter((m) => m.active).map((m) => m.name);
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
