"use client";

import { useMemo, useState } from "react";
import { getTrack, getDisplayTracks, catalogReleases } from "@/content/tracks";
import { useLibrary } from "@/context/LibraryContext";
import { TrackRow } from "@/components/music/TrackRow";
import { LibraryArtwork } from "@/components/library/LibraryArtwork";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { playbackItemFromTrack } from "@/lib/music/playback";
import { isPlaceholderArtwork } from "@/lib/library/resolve-display";
import Link from "next/link";

const BROWSE_PAGE = 60;

export function LibraryLikedTracks() {
  const { likedTracks, ready } = useLibrary();
  const [query, setQuery] = useState("");
  const [browseLimit, setBrowseLimit] = useState(BROWSE_PAGE);

  const q = query.trim().toLowerCase();

  const liked = useMemo(() => {
    const tracks = likedTracks
      .map((id) => getTrack(id))
      .filter((t): t is NonNullable<typeof t> => !!t);
    if (!q) return tracks;
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
    );
  }, [likedTracks, q]);

  const likedQueue = useMemo(() => liked.map(playbackItemFromTrack), [liked]);

  const catalog = useMemo(() => {
    const all = getDisplayTracks();
    if (!q) return all;
    return all.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
    );
  }, [q]);

  const browseTracks = catalog.slice(0, browseLimit);
  const browseQueue = useMemo(
    () => browseTracks.map(playbackItemFromTrack),
    [browseTracks],
  );

  const albums = useMemo(() => {
    const releases = catalogReleases.filter(
      (r) =>
        (r.type === "album" || r.type === "ep") &&
        !isPlaceholderArtwork(r.coverArt) &&
        !!r.coverArt?.trim(),
    );
    if (!q) return releases.slice(0, 24);
    return releases
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.artist.toLowerCase().includes(q),
      )
      .slice(0, 24);
  }, [q]);

  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Tracks</h1>
      <div className="mt-6">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setBrowseLimit(BROWSE_PAGE);
          }}
          placeholder="Search tracks and albums…"
          aria-label="Search tracks"
        />
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-foreground">Liked</h2>
        <p className="mt-1 text-sm text-muted">{liked.length} liked</p>
        {!ready ? (
          <p className="mt-6 text-sm text-muted" role="status">Loading liked tracks…</p>
        ) : liked.length === 0 ? (
          <div className="mt-6 rounded-sm border border-dashed border-border px-6 py-10 text-center">
            <p className="text-foreground">No liked tracks yet</p>
            <p className="mt-1 text-sm text-muted">
              Like tracks while browsing the catalog below.
            </p>
          </div>
        ) : (
          <ol className="mt-6 divide-y divide-border/60">
            {liked.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} browseQueue={likedQueue} />
            ))}
          </ol>
        )}
      </section>

      {albums.length > 0 && (
        <section className="mt-14">
          <h2 className="font-serif text-xl text-foreground">Albums</h2>
          <p className="mt-1 text-sm text-muted">Releases from the archive catalog</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {albums.map((release) => (
              <li key={release.id}>
                <Link
                  href={`/artists/${release.artistSlug}`}
                  className="flex gap-3 rounded-sm border border-border/70 p-3 transition-colors hover:border-muted hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden">
                    <LibraryArtwork
                      src={release.coverArt}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{release.title}</p>
                    <p className="truncate text-xs text-muted">
                      {release.artist} · {release.year} · {release.type}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <h2 className="font-serif text-xl text-foreground">Browse catalog</h2>
        <p className="mt-1 text-sm text-muted">
          {catalog.length} tracks{q ? " matching search" : ""}
        </p>
        {browseTracks.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No tracks match that search.</p>
        ) : (
          <>
            <ol className="mt-6 divide-y divide-border/60">
              {browseTracks.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} browseQueue={browseQueue} />
              ))}
            </ol>
            {browseLimit < catalog.length ? (
              <div className="mt-6">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBrowseLimit((n) => n + BROWSE_PAGE)}
                >
                  Show more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
