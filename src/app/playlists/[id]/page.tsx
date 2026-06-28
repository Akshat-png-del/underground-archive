import type { Metadata } from "next";
import { PlaylistPageContent } from "@/components/library/PlaylistPageContent";
import { getPlaylistById } from "@/lib/library/store";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const playlist = getPlaylistById(id, []);
  if (!playlist) return {};
  return buildMetadata({
    title: playlist.title,
    description: playlist.description || `Playlist by ${playlist.creatorName}`,
    path: `/playlists/${id}`,
  });
}

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PlaylistPageContent playlistId={id} />
    </div>
  );
}
