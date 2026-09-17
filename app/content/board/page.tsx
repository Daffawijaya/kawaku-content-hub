import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { pillWhite } from "@/components/ui/button";
import { ContentBoard } from "@/components/content-board";
import { ContentTabs } from "@/components/content-tabs";

export default function ContentBoardPage() {
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Content"
        description="Kelola stok dan konten terjadwal KAWAKU."
        action={
          <Link href="/content/create" className={pillWhite}>
            Create Content
          </Link>
        }
      />
      <ContentTabs active="board" />
      <ContentBoard />
    </div>
  );
}
