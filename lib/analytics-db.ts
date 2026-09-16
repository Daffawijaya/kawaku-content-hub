// Harian analytics: Supabase only. Tabel kosong = tidak ada data,
// jangan substitusi angka palsu yg tak bisa dibedakan dari real.
import { getBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";

export type DailyRow = {
  date: string; // YYYY-MM-DD
  reach: number;
  impressions: number;
  engagement: number;
};

export function usesAnalyticsDb() {
  return isSupabaseConfigured();
}

export async function listAnalyticsDaily(): Promise<DailyRow[]> {
  const supabase = getBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase
    .from("analytics_daily")
    .select("date,reach,impressions,engagement")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DailyRow[]).filter((r) => r.date);
}
