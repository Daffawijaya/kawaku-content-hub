// Harian analytics: Supabase bila dikonfigurasi, fallback mock.
import { getBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { analyticsDaily as mockDaily } from "./mock";

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
  if (!supabase) return mockDaily;
  const { data, error } = await supabase
    .from("analytics_daily")
    .select("date,reach,impressions,engagement")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  // Tabel kosong = tidak ada data. Jangan substitusi mock agar
  // UI tidak menampilkan angka palsu yg tak bisa dibedakan dari real.
  return ((data ?? []) as DailyRow[]).filter((r) => r.date);
}
