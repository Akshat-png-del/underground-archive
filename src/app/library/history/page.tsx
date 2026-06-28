import type { Metadata } from "next";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibraryHistory } from "@/components/library/LibraryHistory";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Listening History",
  description: "Recently played tracks and sets.",
  path: "/library/history",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-8 lg:flex-row">
        <LibraryNav />
        <div className="flex-1 min-w-0"><LibraryHistory /></div>
      </div>
    </div>
  );
}
