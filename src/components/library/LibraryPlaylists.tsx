"use client";

import Link from "next/link";
import { useLibrary } from "@/context/LibraryContext";
import { usePlaylistModal } from "@/components/library/PlaylistModal";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";

export function LibraryPlaylists() {
  const { playlists } = useLibrary();
  const { openCreatePlaylist } = usePlaylistModal();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-foreground">My Playlists</h1>
          <p className="mt-2 text-muted-light">{playlists.length} playlists</p>
        </div>
        <Button onClick={openCreatePlaylist}>Create playlist</Button>
      </div>

      {playlists.length === 0 ? (
        <p className="mt-12 text-muted">No playlists yet. Create one to start collecting tracks and sets.</p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {playlists.map((p) => (
            <Link key={p.id} href={`/playlists/${p.id}`} className="interactive-row flex gap-4 border border-border p-4">
              <div className="relative h-20 w-20 shrink-0">
                <SafeImage src={p.coverImage} alt="" fill sizes="80px" />
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
    </div>
  );
}
