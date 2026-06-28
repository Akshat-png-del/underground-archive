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
import { SetCardEmbed } from "@/components/artists/SetCard";
import { MusicActions } from "@/components/music/MusicActions";
import { ArtistCard } from "@/components/artists/ArtistCard";
import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-12">
      <h2 className="font-serif text-2xl text-foreground sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SpotifyListenEmbed({ url }: { url: string }) {
  const embed = extractSpotifyEmbedUrl(url);
  if (!embed) return null;
  return (
    <iframe
      src={embed}
      width="100%"
      height="352"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify artist"
      className="border-0"
    />
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
      <Section title="Top tracks">
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
            {hasSpotify && <SpotifyListenEmbed url={spotifyUrl} />}
          </div>
        )}
      </Section>

      {latestReleases.length > 0 && (
        <Section title="Latest releases">
          <div className="grid gap-3 sm:grid-cols-2">
            {latestReleases.map((r) => (
              <div key={r.id} className="flex gap-3 border border-border p-3">
                <div className="relative h-14 w-14 shrink-0">
                  <SafeImage src={r.coverArt} alt="" fill sizes="56px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted">
                    {r.type} · {r.year}{r.label ? ` · ${r.label}` : ""}
                  </p>
                  <div className="mt-2">
                    <MusicActions
                      type="release"
                      refId={r.id}
                      label={`${r.title} — ${r.artist}`}
                      spotifyUrl={r.spotifyUrl}
                      compact
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Essential sets">
        {hasSets ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {sets.map((set) => (
              <div key={set.id}>
                <Link href={`/sets/${set.slug}`} className="mb-2 inline-block text-sm text-accent hover:underline">
                  {set.event} · {set.location}
                </Link>
                <SetCardEmbed
                  set={archiveSetToEssential(set)}
                  artistId={artist.id}
                  artistSlug={artist.slug}
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
                <SpotifyListenEmbed url={spotifyUrl} />
              </>
            ) : (
              <p className="text-sm text-muted-light">No archived sets yet.</p>
            )}
            {similar.length > 0 && (
              <div>
                <p className="mb-4 text-xs uppercase tracking-wider text-muted">Similar artists with sets</p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {similar.map((a) => (
                    <ArtistCard
                      key={a.slug}
                      slug={a.slug}
                      name={a.name}
                      portrait={a.portrait}
                      genres={a.genres}
                      city={a.city}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {!hasSets && hasTracks && hasSpotify && (
        <Section title="Listen on Spotify">
          <SpotifyListenEmbed url={spotifyUrl} />
        </Section>
      )}
    </>
  );
}
