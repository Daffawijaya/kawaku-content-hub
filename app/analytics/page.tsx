import { PageHeader } from "@/components/page-header";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Performa konten KAWAKU — mock, siap menerima data backend."
      />
      <AnalyticsDashboard />
    </div>
  );
}
