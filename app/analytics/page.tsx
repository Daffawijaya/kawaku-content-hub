import { PageHeader } from "@/components/page-header";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

export default function AnalyticsPage() {
  // BG dark disamakan YT (#0f0f0f, bukan hitam pekat) — lokal halaman ini
  // saja (shell memberi main full-bleed khusus /analytics).
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Analitik"
        description="Performa konten KAWAKU."
      />
      <AnalyticsDashboard />
    </div>
  );
}
