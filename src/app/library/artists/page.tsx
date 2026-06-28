import type { Metadata } from "next";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibrarySavedArtists } from "@/components/library/LibrarySavedArtists";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Saved Artists",
  description: "Your saved underground electronic music artists.",
  path: "/library/artists",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-8 lg:flex-row">
        <LibraryNav />
        <div className="flex-1 min-w-0"><LibrarySavedArtists /></div>
      </div>
    </div>
  );
}
