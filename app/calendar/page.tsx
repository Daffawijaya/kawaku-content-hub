import { PageHeader } from "@/components/page-header";
import { ContentCalendar } from "@/components/content-calendar";

export default function CalendarPage() {
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Kalender Konten"
      />
      <ContentCalendar />
    </div>
  );
}
