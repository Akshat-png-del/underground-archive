import { getSetsByArtist, getSet } from "@/content/sets";
import { catalogReleases, getTracksByArtist } from "@/content/tracks";
import type { Artist, ListeningPathStep } from "@/types";
import { releaseId, slugify, trackId } from "@/lib/music";
import type { PlaybackItem } from "@/lib/music/playback";
import {
  playbackItemFromRelease,
  playbackItemFromSet,
  playbackItemFromTrack,
} from "@/lib/music/playback";

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Exact normalized title match only — never fuzzy-substitute a different performance. */
function titlesEqual(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  return !!na && !!nb && na === nb;
}

export function resolveListeningPathHref(artist: Artist, step: ListeningPathStep): string {
  const artistHref = `/artists/${artist.slug}`;

  if (step.type === "track") {
    const catalogTrack = getTracksByArtist(artist.slug).find((t) => titlesEqual(step.title, t.title));
    if (catalogTrack) return `${artistHref}#track-${catalogTrack.id}`;

    const track = artist.topTracks.find((t) => titlesEqual(step.title, t.title));
    if (track) return `${artistHref}#track-${trackId(artist.slug, track.title)}`;

    return `${artistHref}#top-tracks`;
  }

  if (step.type === "set") {
    const archiveSet = getSetsByArtist(artist.slug).find((s) => titlesEqual(step.title, s.title));
    if (archiveSet) return `/sets/${archiveSet.slug}`;

    const bySlug = getSet(slugify(artist.slug, step.title));
    if (bySlug && bySlug.artistSlug === artist.slug) return `/sets/${bySlug.slug}`;

    const essential = artist.essentialSets.find((s) => titlesEqual(step.title, s.title));
    if (essential) {
      const slug = slugify(artist.slug, essential.title);
      const matched = getSet(slug);
      if (matched && matched.artistSlug === artist.slug) return `/sets/${matched.slug}`;
    }

    // No verified match — stay on the artist page rather than open a different set.
    return `${artistHref}#essential-sets`;
  }

  if (step.type === "ep" || step.type === "album") {
    const pool =
      step.type === "album"
        ? artist.albums
        : [...artist.eps, ...artist.albums, ...artist.singles];

    const release = pool.find((r) => titlesEqual(step.title, r.title));
    if (release) {
      const type = artist.albums.some((a) => a.title === release.title)
        ? "album"
        : artist.eps.some((e) => e.title === release.title)
          ? "ep"
          : "single";
      return `${artistHref}#release-${releaseId(artist.slug, release.title, type)}`;
    }

    return `${artistHref}#releases`;
  }

  return artistHref;
}

export function resolveListeningPathPlaybackItem(
  artist: Artist,
  step: ListeningPathStep,
): PlaybackItem | null {
  if (step.type === "track") {
    const catalogTrack = getTracksByArtist(artist.slug).find((t) => titlesEqual(step.title, t.title));
    if (catalogTrack) return playbackItemFromTrack(catalogTrack);

    const track = artist.topTracks.find((t) => titlesEqual(step.title, t.title));
    if (track) {
      const id = trackId(artist.slug, track.title);
      const fromCatalog = getTracksByArtist(artist.slug).find((t) => t.id === id);
      if (fromCatalog) return playbackItemFromTrack(fromCatalog);
    }

    // Never play a substitute track under a different title.
    return null;
  }

  if (step.type === "set") {
    const archiveSet = getSetsByArtist(artist.slug).find((s) => titlesEqual(step.title, s.title));
    if (archiveSet) return playbackItemFromSet(archiveSet);

    const bySlug = getSet(slugify(artist.slug, step.title));
    if (bySlug && bySlug.artistSlug === artist.slug) return playbackItemFromSet(bySlug);

    const essential = artist.essentialSets.find((s) => titlesEqual(step.title, s.title));
    if (essential?.youtubeId) {
      const slug = slugify(artist.slug, essential.title);
      const matched = getSetsByArtist(artist.slug).find((s) => s.slug === slug);
      if (matched) return playbackItemFromSet(matched);
    }

    // Never play a different set under this step's title.
    return null;
  }

  if (step.type === "ep" || step.type === "album") {
    const catalogRelease = catalogReleases.find(
      (r) => r.artistSlug === artist.slug && titlesEqual(step.title, r.title),
    );
    if (catalogRelease) return playbackItemFromRelease(catalogRelease);

    const pool =
      step.type === "album"
        ? artist.albums
        : [...artist.eps, ...artist.albums, ...artist.singles];
    const release = pool.find((r) => titlesEqual(step.title, r.title));
    if (release) {
      const type = artist.albums.some((a) => a.title === release.title)
        ? "album"
        : artist.eps.some((e) => e.title === release.title)
          ? "ep"
          : "single";
      const id = releaseId(artist.slug, release.title, type);
      const fromCatalog = catalogReleases.find((r) => r.id === id);
      if (fromCatalog) return playbackItemFromRelease(fromCatalog);
    }
  }

  return null;
}
