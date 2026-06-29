import type { Artist, EssentialSet, Track } from "@/types";
import type { CatalogExpansion } from "@/lib/catalog/types";
import { getCurationTier } from "@/lib/archive/curation/tiers";
import { attachSetVerification, attachTrackVerification } from "@/lib/archive/verification";
import { trackCover } from "@/content/artists/track-covers";
import { spotifyTrackUrl } from "@/lib/archive/pipeline/validate";
import { youtubeIdAllowedForArtist } from "@/lib/archive/verification";
import expansions from "@/content/artists/metadata/expansions.json";

const bySlug = new Map<string, CatalogExpansion>(
  Object.entries(expansions as Record<string, CatalogExpansion>).map(([slug, data]) => [
    slug,
    { ...data, slug },
  ])
);

export function getCatalogExpansion(slug: string): CatalogExpansion | undefined {
  return bySlug.get(slug);
}

function trackKey(t: Pick<Track, "id" | "spotifyUrl" | "title">): string {
  const id = t.spotifyUrl?.match(/\/track\/([a-zA-Z0-9]{22})/)?.[1];
  return id ?? t.id ?? t.title.toLowerCase();
}

function setKey(s: Pick<EssentialSet, "youtubeId">): string {
  return s.youtubeId;
}

function dedupeSets(sets: EssentialSet[]): EssentialSet[] {
  const seenYoutube = new Set<string>();
  const seenId = new Set<string>();
  const out: EssentialSet[] = [];
  for (const s of sets) {
    if (seenYoutube.has(s.youtubeId) || seenId.has(s.id)) continue;
    seenYoutube.add(s.youtubeId);
    seenId.add(s.id);
    out.push(s);
  }
  return out;
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seenSpotify = new Set<string>();
  const seenId = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    const spotifyId = t.spotifyUrl?.match(/\/track\/([a-zA-Z0-9]{22})/)?.[1];
    if (spotifyId && seenSpotify.has(spotifyId)) continue;
    if (seenId.has(t.id)) continue;
    if (spotifyId) seenSpotify.add(spotifyId);
    seenId.add(t.id);
    out.push(t);
  }
  return out;
}

function expansionToTrack(
  slug: string,
  t: CatalogExpansion["tracks"][0],
  status: Artist["verificationStatus"],
  genre: Artist["genres"][0] | undefined
): Track {
  const url = spotifyTrackUrl(t.spotifyTrackId);
  return attachTrackVerification(
    slug,
    {
      title: t.title,
      year: t.year,
      duration: t.duration,
      coverArt: trackCover(url, { genre }),
      spotifyUrl: url,
    },
    status
  );
}

function expansionToSet(
  slug: string,
  s: CatalogExpansion["sets"][0],
  status: Artist["verificationStatus"]
): EssentialSet {
  return attachSetVerification(slug, s, status);
}

/**
 * Merge script-fetched / curated expansions into an artist.
 * Existing tracks and sets are preserved; new items are appended.
 */
export function applyCatalogExpansion(artist: Artist): Artist {
  const expansion = getCatalogExpansion(artist.slug);
  if (!expansion) return artist;

  const tier = getCurationTier(artist.slug);
  const status: Artist["verificationStatus"] =
    tier === 1 ? "verified" : tier === 2 ? "partial" : "unverified";

  const existingTrackKeys = new Set(artist.topTracks.map(trackKey));
  const existingSetKeys = new Set(artist.essentialSets.map(setKey));

  const addedTracks = expansion.tracks
    .filter((t) => t.spotifyTrackId?.length === 22)
    .map((t) => expansionToTrack(artist.slug, t, status, artist.genres[0]))
    .filter((t) => !existingTrackKeys.has(trackKey(t)));

  const addedSets = expansion.sets
    .filter(
      (s) =>
        s.youtubeId?.length === 11 && youtubeIdAllowedForArtist(s.youtubeId, artist.slug)
    )
    .map((s) => expansionToSet(artist.slug, s, status))
    .filter((s) => !existingSetKeys.has(setKey(s)));

  if (addedTracks.length === 0 && addedSets.length === 0) return artist;

  return {
    ...artist,
    topTracks: dedupeTracks([...artist.topTracks, ...addedTracks]),
    essentialSets: dedupeSets([...artist.essentialSets, ...addedSets]),
  };
}
