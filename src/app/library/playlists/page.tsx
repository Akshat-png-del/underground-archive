import type { Metadata } from "next";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibraryPlaylists } from "@/components/library/LibraryPlaylists";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "My Playlists",
  description: "Create and manage your personal playlists.",
  path: "/library/playlists",
});

export default function LibraryPlaylistsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-8 lg:flex-row">
        <LibraryNav />
        <div className="flex-1 min-w-0">
          <LibraryPlaylists />
        </div>
      </div>
    </div>
  );
}
