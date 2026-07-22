"use client";

import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { usePlaylistModal } from "@/components/library/PlaylistModal";
import { Button } from "@/components/ui/Button";
import { LibraryArtwork } from "@/components/library/LibraryArtwork";
import { archiveSets } from "@/content/sets";
import { isPlaceholderArtwork } from "@/lib/library/resolve-display";

const HARD_TECHNO_PLAYLIST_ART = archiveSets
  .filter((set) => set.genres.includes("hard-techno"))
  .map((set) => set.thumbnail)
  .filter((thumbnail): thumbnail is string => Boolean(thumbnail));

function playlistArtwork(playlistId: string, coverImage: string): string | undefined {
  if (!isPlaceholderArtwork(coverImage)) return coverImage;
  const index = [...playlistId].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return HARD_TECHNO_PLAYLIST_ART[index % HARD_TECHNO_PLAYLIST_ART.length];
}

export function LibraryPlaylists() {
  const { playlists, publicPlaylists, ready } = useLibrary();
  const { openCreatePlaylist } = usePlaylistModal();
  const communityPlaylists = publicPlaylists.filter(
    (p) => !playlists.some((mine) => mine.id === p.id),
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground">My Playlists</h1>
          <p className="mt-2 text-muted-light">{playlists.length} playlists</p>
        </div>
        <Button onClick={openCreatePlaylist}>Create playlist</Button>
      </div>

      {!ready ? (
        <p className="mt-10 text-sm text-muted" role="status">Loading playlists…</p>
      ) : playlists.length === 0 ? (
        <div className="mt-10 rounded-sm border border-dashed border-border px-6 py-10 text-center">
          <p className="text-foreground">No playlists yet</p>
          <p className="mt-1 text-sm text-muted">Create one to start collecting tracks and sets.</p>
          <p className="mt-3 text-sm text-muted">
            Or browse{" "}
            <Link href="/community" className="text-accent hover:underline">
              community playlists
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {playlists.map((p) => (
            <Link
              key={p.id}
              href={`/playlists/${p.id}`}
              className="flex gap-4 rounded-sm border border-border/70 p-4 transition-colors hover:border-muted hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <div className="relative h-20 w-20 shrink-0">
                <LibraryArtwork
                  src={playlistArtwork(p.id, p.coverImage)}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-serif text-lg text-foreground">{p.title}</p>
                <p className="text-sm text-muted">{p.items.length} items · {p.isPublic ? "Public" : "Private"}</p>
                {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-light">{p.description}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {ready && communityPlaylists.length > 0 ? (
        <section className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-2xl text-foreground">Community playlists</h2>
            <Link href="/community" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
          <p className="mt-2 text-sm text-muted-light">
            {communityPlaylists.length} public playlists from the archive catalog.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {communityPlaylists.map((p) => (
              <Link
                key={p.id}
                href={`/playlists/${p.id}`}
                className="flex gap-4 rounded-sm border border-border/70 p-4 transition-colors hover:border-muted hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <div className="relative h-20 w-20 shrink-0">
                  <LibraryArtwork
                    src={playlistArtwork(p.id, p.coverImage)}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-serif text-lg text-foreground">{p.title}</p>
                  <p className="text-sm text-muted">
                    {p.items.length} tracks · {p.likeCount} likes · {p.creatorName}
                  </p>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-light">{p.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
