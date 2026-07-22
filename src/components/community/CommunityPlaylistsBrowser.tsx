import Link from "next/link";
import { getCommunityPlaylists } from "@/content/home/feed";
import { PlaylistCover } from "@/components/library/PlaylistCover";
import { formatLocaleNumber } from "@/lib/format";

/** Full community playlist index — same catalog as homepage Community section. */
export function CommunityPlaylistsBrowser() {
  const playlists = getCommunityPlaylists();

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground sm:text-4xl">Community Playlists</h1>
      <p className="mt-3 max-w-2xl text-muted-light">
        Curated Spotify audio playlists from the archive — {playlists.length} public playlists.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((p) => (
          <Link
            key={p.id}
            href={`/playlists/${p.id}`}
            className="card-editorial group block border border-border bg-surface p-4 hover-glow"
          >
            <div className="relative mb-4 aspect-square overflow-hidden">
              <PlaylistCover playlist={p} fill sizes="33vw" className="image-zoom" />
            </div>
            <p className="font-serif text-lg text-foreground group-hover:text-accent">{p.title}</p>
            <p className="mt-1 text-sm text-muted">{p.creatorName}</p>
            <p className="mt-2 font-mono text-xs text-muted-light">
              {p.items.length} tracks · {formatLocaleNumber(p.likeCount)} likes
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
