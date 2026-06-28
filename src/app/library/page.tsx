import type { Metadata } from "next";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibraryProfile } from "@/components/library/LibraryProfile";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Your Library",
  description: "Profile, playlists, saved artists, and listening history.",
  path: "/library",
});

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-8 lg:flex-row">
        <LibraryNav />
        <div className="flex-1 min-w-0">
          <LibraryProfile />
        </div>
      </div>
    </div>
  );
}
