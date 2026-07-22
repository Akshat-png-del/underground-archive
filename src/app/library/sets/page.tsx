import type { Metadata } from "next";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibrarySavedSets } from "@/components/library/LibrarySavedSets";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Sets",
  description: "Saved DJ sets and the full sets catalog in your library.",
  path: "/library/sets",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-8 lg:flex-row">
        <LibraryNav />
        <div className="flex-1 min-w-0"><LibrarySavedSets /></div>
      </div>
    </div>
  );
}
