import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";
import type { AppRole } from "./types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // dipanggil dari Server Component read-only — aman diabaikan
        }
      },
    },
  });
}

export type SessionProfile = {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: AppRole;
  active: boolean;
};

// Null bila Supabase belum dikonfigurasi atau belum login.
export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, initials, role, active")
    .eq("id", user.id)
    .single();
  const name =
    profile?.name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "User";
  return {
    id: user.id,
    email: user.email ?? "",
    name,
    initials:
      profile?.initials ??
      name
        .split(" ")
        .map((w: string) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    role: (profile?.role as AppRole | undefined) ?? "admin",
    active: profile?.active ?? true,
  };
}
