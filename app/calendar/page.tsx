import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ContentCalendar } from "@/components/content-calendar";

export default function CalendarPage() {
  return (
    <div>
      <PageHeader
        title="Content Calendar"
        description="Jadwal publikasi lintas type dan channel KAWAKU."
        action={
          <Link href="/content/create">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Create Content
            </Button>
          </Link>
        }
      />
      <ContentCalendar />
    </div>
  );
}
