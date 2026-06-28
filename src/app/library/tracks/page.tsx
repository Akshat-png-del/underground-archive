import type { Metadata } from "next";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibraryLikedTracks } from "@/components/library/LibraryLikedTracks";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Liked Tracks",
  description: "Tracks you have liked across the archive.",
  path: "/library/tracks",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-8 lg:flex-row">
        <LibraryNav />
        <div className="flex-1 min-w-0"><LibraryLikedTracks /></div>
      </div>
    </div>
  );
}
