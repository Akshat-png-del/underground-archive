"use client";

import type { Artist } from "@/types";
import { genreLabels, getArtist } from "@/content/artists";
import {
  getLatestReleasesByArtist,
  getTracksByArtist,
} from "@/content/tracks";
import { getSetsByArtist, archiveSetToEssential } from "@/content/sets";
import { extractSpotifyEmbedUrl } from "@/lib/music";
import { TrackRow } from "@/components/music/TrackRow";
import { TrackArtwork } from "@/components/music/TrackArtwork";
import { SetCardEmbed } from "@/components/artists/SetCard";
import { MusicActions } from "@/components/music/MusicActions";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { playbackItemFromRelease } from "@/lib/music/playback";
import { useCardPlayback } from "@/lib/music/use-card-playback";

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

function SpotifyListenButton({ url, label }: { url: string; label: string }) {
  return (
    <MusicActions
      type="release"
      refId={`spotify-${label}`}
      label={label}
      spotifyUrl={url}
    />
  );
}

function ReleaseCard({
  release,
  genres,
}: {
  release: ReturnType<typeof getLatestReleasesByArtist>[number];
  genres: Artist["genres"];
}) {
  const item = playbackItemFromRelease(release);
  const { handleCardPointerDown, stopCardPointerDown, active } = useCardPlayback(
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
        <TrackArtwork coverArt={release.coverArt} genres={genres} alt="" fill sizes="56px" />
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
  const spotifyUrl = artist.externalLinks.spotify;

  const similar = artist.similarArtists
    .filter((s) => s !== artist.slug)
    .map((s) => getArtist(s))
    .filter((a): a is Artist => !!a)
    .slice(0, 3);

  const hasSets = sets.length > 0;
  const hasTracks = topTracks.length > 0;
  const hasSpotify = !!spotifyUrl && !!extractSpotifyEmbedUrl(spotifyUrl);

  return (
    <>
      <Section title="Top tracks" id="top-tracks">
        {hasTracks ? (
          <ol className="space-y-3">
            {topTracks.map((track, i) => (
              <TrackRow key={track.id} track={track} index={i} />
            ))}
          </ol>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-light">
              Track listing is being expanded. Explore similar artists below or listen on Spotify.
            </p>
            {hasSpotify && <SpotifyListenButton url={spotifyUrl} label={artist.name} />}
          </div>
        )}
      </Section>

      {latestReleases.length > 0 && (
        <Section title="Latest releases" id="releases">
          <div className="grid gap-3 sm:grid-cols-2">
            {latestReleases.map((r) => (
              <ReleaseCard key={r.id} release={r} genres={artist.genres} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Essential sets" id="essential-sets">
        {hasSets ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {sets.map((set) => (
              <div key={set.id}>
                <SetCardEmbed
                  set={archiveSetToEssential(set)}
                  artistId={artist.id}
                  artistSlug={artist.slug}
                  setId={set.id}
                  setSlug={set.slug}
                />
                <div className="mt-2">
                  <MusicActions
                    type="set"
                    refId={set.id}
                    label={`${set.title} — ${set.artistName}`}
                    youtubeId={set.youtubeId}
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {hasSpotify ? (
              <>
                <p className="text-sm text-muted-light">No archived sets yet — listen on Spotify.</p>
                <SpotifyListenButton url={spotifyUrl} label={artist.name} />
              </>
            ) : (
              <p className="text-sm text-muted-light">No archived sets yet.</p>
            )}
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
