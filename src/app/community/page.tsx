import type { Metadata } from "next";
import { CommunityPlaylistsBrowser } from "@/components/community/CommunityPlaylistsBrowser";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Community Playlists",
  description:
    "Public curated Spotify playlists from The Underground Archive — hard techno, industrial, schranz, EBM, and more.",
  path: "/community",
});

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <CommunityPlaylistsBrowser />
    </div>
  );
}
