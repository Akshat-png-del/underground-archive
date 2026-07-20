"use client";

import type { Artist } from "@/types";
import { useMemo } from "react";
import { genreLabels, getArtist } from "@/content/artists";
import {
  getLatestReleasesByArtist,
  getTracksByArtist,
} from "@/content/tracks";
import { getSetsByArtist, archiveSetToEssential } from "@/content/sets";
import { TrackRow } from "@/components/music/TrackRow";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { MusicActions } from "@/components/music/MusicActions";
import { SetCardEmbed } from "@/components/artists/SetCard";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { playbackItemFromRelease, playbackItemFromTrack, playbackItemFromSet } from "@/lib/music/playback";
import { useCardPlayback, playbackItemActive } from "@/lib/music/use-card-playback";
import { useFinalPlaybackSnapshot } from "@/lib/music/use-final-playback-snapshot";

function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-28 border-t border-border pt-12" : "border-t border-border pt-12"}>
      <h2 className="font-serif text-2xl text-foreground sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ReleaseCard({
  release,
  genres,
  artistSlug,
}: {
  release: ReturnType<typeof getLatestReleasesByArtist>[number];
  genres: Artist["genres"];
  artistSlug: string;
}) {
  const item = playbackItemFromRelease(release);
  const snapshot = useFinalPlaybackSnapshot();
  const active = playbackItemActive(snapshot, "release", release.id);
  const { handleCardPointerDown, stopCardPointerDown } = useCardPlayback(
    item,
    "release",
    release.id,
  );

  return (
    <div
      id={`release-${release.id}`}
      onPointerDown={handleCardPointerDown}
      className={`scroll-mt-28 flex cursor-pointer touch-manipulation gap-3 border p-3 transition-colors ${
        active ? "border-accent bg-surface" : "border-border"
      }`}
      role="button"
      tabIndex={0}
      aria-label={`Play ${release.title}`}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden">
        <TrackArtwork
          coverArt={release.coverArt}
          genres={genres}
          artistSlug={artistSlug}
          alt=""
          fill
          sizes="56px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{release.title}</p>
        <p className="text-xs text-muted">
          {release.type} · {release.year}
          {release.label ? ` · ${release.label}` : ""}
        </p>
        <div className="mt-2" onPointerDown={stopCardPointerDown}>
          <MusicActions
            type="release"
            refId={release.id}
            label={`${release.title} — ${release.artist}`}
            spotifyUrl={release.spotifyUrl}
            compact
          />
        </div>
      </div>
    </div>
  );
}

export function ArtistMusicSection({ artist }: { artist: Artist }) {
  const topTracks = getTracksByArtist(artist.slug);
  const latestReleases = getLatestReleasesByArtist(artist.slug);
  const sets = getSetsByArtist(artist.slug);
  const trackBrowseQueue = useMemo(() => topTracks.map(playbackItemFromTrack), [topTracks]);
  const setBrowseQueue = useMemo(
    () => sets.map((set) => playbackItemFromSet(set)),
    [sets],
  );

  const similar = artist.similarArtists
    .filter((s) => s !== artist.slug)
    .map((s) => getArtist(s))
    .filter((a): a is Artist => !!a)
    .slice(0, 3);

  const hasSets = sets.length > 0;
  const hasTracks = topTracks.length > 0;

  return (
    <>
      <Section title="Top tracks" id="top-tracks">
        {hasTracks ? (
          <ol className="space-y-3">
            {topTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} browseQueue={trackBrowseQueue} />
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-light">
            Track listing is being expanded. Explore similar artists below.
          </p>
        )}
      </Section>

      {latestReleases.length > 0 && (
        <Section title="Latest releases" id="releases">
          <div className="grid gap-3 sm:grid-cols-2">
            {latestReleases.map((r) => (
              <ReleaseCard key={r.id} release={r} genres={artist.genres} artistSlug={artist.slug} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Essential sets" id="essential-sets">
        {hasSets ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {sets.map((set, i) => (
              <SetCardEmbed
                key={set.id}
                set={archiveSetToEssential(set)}
                artistId={artist.id}
                artistSlug={artist.slug}
                setId={set.id}
                setSlug={set.slug}
                browseQueue={setBrowseQueue}
                browseIndex={i}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-light">No archived sets yet.</p>
            {similar.length > 0 && (
              <div>
                <p className="mb-4 text-xs uppercase tracking-wider text-muted">Similar artists with sets</p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {similar.map((a) => (
                    <ArtistCard key={a.slug} artist={a} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

    </>
  );
}
