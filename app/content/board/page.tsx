import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ContentBoard } from "@/components/content-board";
import { ContentTabs } from "@/components/content-tabs";

export default function ContentBoardPage() {
  return (
    <div>
      <PageHeader
        title="Content"
        description="Papan status konten KAWAKU — seret card untuk mengubah status."
        action={
          <Link href="/content/create">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Create Content
            </Button>
          </Link>
        }
      />
      <ContentTabs active="board" />
      <ContentBoard />
    </div>
  );
}
