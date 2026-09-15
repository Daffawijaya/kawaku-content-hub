import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { igAppAuth, isInstagramConfigured, isRefreshConfigured } from "./config";

// Token aktif: DB (auto-refresh) menang, env sebagai fallback awal.
// Tanpa DB/admin-key, langsung pakai env apa adanya.
let cached: { token: string; exp: number } | null = null;

export async function resolveToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  if (isAdminConfigured()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.from("ig_token_state").select("access_token,expires_at").eq("id", 1).single();
      const row = data as { access_token?: string; expires_at?: string } | null;
      if (row?.access_token) {
        const exp = row.expires_at ? new Date(row.expires_at).getTime() : 0;
        cached = { token: row.access_token, exp: exp > 0 ? exp : Date.now() + 3600_000 };
        if (exp === 0 || exp > Date.now() + 60_000) return row.access_token;
      }
    } catch {
      /* DB belum migrasi / belum ada token — fallback env */
    }
  }
  const env = process.env.IG_PAGE_ACCESS_TOKEN ?? "";
  if (!env) throw new Error("Instagram belum dikonfigurasi (isi IG_PAGE_ACCESS_TOKEN).");
  return env;
}

// Simpan token fresh ke DB (dipakai sekali saat user menempel token baru).
export async function storeToken(token: string, expiresAt: string | null): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("ig_token_state")
    .upsert({ id: 1, access_token: token, expires_at: expiresAt, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Simpan token gagal: ${error.message}`);
  cached = null;
}

// Refresh bila umur < 30 hari. Best-effort: gagal refresh tapi token masih
// valid = lanjut; tanpa token valid sama sekali = throw jelas.
export async function ensureFreshToken(): Promise<string> {
  const token = await resolveToken();
  if (!isRefreshConfigured() || !isAdminConfigured()) return token;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("ig_token_state").select("access_token,expires_at").eq("id", 1).single();
    const row = data as { access_token?: string; expires_at?: string } | null;
    const exp = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
    const base = row?.access_token ?? token;
    if (exp > 0 && exp - Date.now() > 30 * 24 * 3600_000) return base;
    const fresh = await exchangeToken(base);
    await storeToken(fresh.token, fresh.expiresAt);
    return fresh.token;
  } catch {
    if (!isInstagramConfigured()) throw new Error("Token IG expired — tempel token fresh baru.");
    return token;
  }
}

async function exchangeToken(current: string): Promise<{ token: string; expiresAt: string }> {
  const { appId, appSecret } = igAppAuth();
  const url =
    `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(current)}`;
  const res = await fetch(url);
  const json = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  } | null;
  if (!res.ok || !json?.access_token) {
    throw new Error(json?.error?.message ?? "Refresh token IG gagal.");
  }
  const expiresAt = new Date(Date.now() + (json.expires_in ?? 5184000) * 1000).toISOString();
  return { token: json.access_token, expiresAt };
}

// Info umur token utk Settings (null bila tak diketahui).
export async function tokenStatus(): Promise<{ expiresAt: string | null; daysLeft: number | null; autoRefresh: boolean }> {
  const autoRefresh = isRefreshConfigured() && isAdminConfigured();
  if (isAdminConfigured()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin.from("ig_token_state").select("expires_at").eq("id", 1).single();
      const exp = (data as { expires_at?: string } | null)?.expires_at;
      if (exp) {
        const daysLeft = Math.floor((new Date(exp).getTime() - Date.now()) / 86400000);
        return { expiresAt: exp, daysLeft, autoRefresh };
      }
    } catch {
      /* abaikan */
    }
  }
  return { expiresAt: null, daysLeft: null, autoRefresh };
}
