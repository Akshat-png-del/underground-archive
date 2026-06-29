import { getSetsByArtist } from "@/content/sets";
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

function titlesMatch(stepTitle: string, candidate: string): boolean {
  const a = normalizeTitle(stepTitle);
  const b = normalizeTitle(candidate);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const wordsA = a.split(" ").filter((w) => w.length > 2);
  const wordsB = new Set(b.split(" ").filter((w) => w.length > 2));
  if (wordsA.length === 0 || wordsB.size === 0) return false;

  const overlap = wordsA.filter((w) => wordsB.has(w)).length;
  const minWords = Math.min(wordsA.length, wordsB.size);
  return overlap >= Math.ceil(minWords * 0.6);
}

export function resolveListeningPathHref(artist: Artist, step: ListeningPathStep): string {
  const artistHref = `/artists/${artist.slug}`;

  if (step.type === "track") {
    const catalogTrack = getTracksByArtist(artist.slug).find((t) => titlesMatch(step.title, t.title));
    if (catalogTrack) return `${artistHref}#track-${catalogTrack.id}`;

    const track = artist.topTracks.find((t) => titlesMatch(step.title, t.title));
    if (track) return `${artistHref}#track-${trackId(artist.slug, track.title)}`;

    return `${artistHref}#top-tracks`;
  }

  if (step.type === "set") {
    const archiveSet = getSetsByArtist(artist.slug).find((s) => titlesMatch(step.title, s.title));
    if (archiveSet) return `/sets/${archiveSet.slug}`;

    const essential = artist.essentialSets.find((s) => titlesMatch(step.title, s.title));
    if (essential) return `/sets/${slugify(artist.slug, essential.title)}`;

    const firstSet = getSetsByArtist(artist.slug)[0];
    if (firstSet) return `/sets/${firstSet.slug}`;

    return `${artistHref}#essential-sets`;
  }

  if (step.type === "ep" || step.type === "album") {
    const pool =
      step.type === "album"
        ? artist.albums
        : [...artist.eps, ...artist.albums, ...artist.singles];

    const release = pool.find((r) => titlesMatch(step.title, r.title));
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
    const catalogTrack = getTracksByArtist(artist.slug).find((t) => titlesMatch(step.title, t.title));
    if (catalogTrack) return playbackItemFromTrack(catalogTrack);

    const track = artist.topTracks.find((t) => titlesMatch(step.title, t.title));
    if (track) {
      const id = trackId(artist.slug, track.title);
      const fromCatalog = getTracksByArtist(artist.slug).find((t) => t.id === id);
      if (fromCatalog) return playbackItemFromTrack(fromCatalog);
    }

    const first = getTracksByArtist(artist.slug)[0];
    return first ? playbackItemFromTrack(first) : null;
  }

  if (step.type === "set") {
    const archiveSet = getSetsByArtist(artist.slug).find((s) => titlesMatch(step.title, s.title));
    if (archiveSet) return playbackItemFromSet(archiveSet);

    const essential = artist.essentialSets.find((s) => titlesMatch(step.title, s.title));
    if (essential?.youtubeId) {
      const slug = slugify(artist.slug, essential.title);
      const matched = getSetsByArtist(artist.slug).find((s) => s.slug === slug);
      if (matched) return playbackItemFromSet(matched);
    }

    const firstSet = getSetsByArtist(artist.slug)[0];
    return firstSet ? playbackItemFromSet(firstSet) : null;
  }

  if (step.type === "ep" || step.type === "album") {
    const catalogRelease = catalogReleases.find(
      (r) => r.artistSlug === artist.slug && titlesMatch(step.title, r.title),
    );
    if (catalogRelease) return playbackItemFromRelease(catalogRelease);

    const pool =
      step.type === "album"
        ? artist.albums
        : [...artist.eps, ...artist.albums, ...artist.singles];
    const release = pool.find((r) => titlesMatch(step.title, r.title));
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
