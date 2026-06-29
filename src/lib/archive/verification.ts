import type { Artist, ArtistImage, EssentialSet, Track, VerificationStatus } from "@/types";
import type { ArchiveSet, CatalogTrack } from "@/types/library";
import { getVerifiedYoutubeByArtist } from "@/content/artists/research";
import { resolveDisplayPortrait, resolveArtistImage, resolvePortraitFallbacks } from "@/lib/archive/images/apply";
import {
  resolveHeroDisplayUrl,
  resolveHeroDisplayFallbacks,
  preferRenderablePortraitUrl,
  buildPortraitDisplayFallbacks,
} from "@/lib/archive/images/display";
import { artistId } from "@/lib/archive/ids";
import { isAllowedSetVenue } from "@/lib/archive/pipeline/validate";
import { trackId as buildTrackId, setId as buildSetId } from "@/lib/music";

/** YouTube IDs editorially verified to belong to specific artists (from research registry). */
export const VERIFIED_YOUTUBE_BY_ARTIST: Readonly<Record<string, readonly string[]>> =
  getVerifiedYoutubeByArtist();

const YOUTUBE_OWNERS = new Map<string, Set<string>>();
for (const [slug, ids] of Object.entries(VERIFIED_YOUTUBE_BY_ARTIST)) {
  for (const id of ids) {
    const owners = YOUTUBE_OWNERS.get(id) ?? new Set<string>();
    owners.add(slug);
    YOUTUBE_OWNERS.set(id, owners);
  }
}

export function isVerifiedArtist(artist: Pick<Artist, "verificationStatus">): boolean {
  return artist.verificationStatus === "verified";
}

export function isPartialArtist(artist: Pick<Artist, "verificationStatus">): boolean {
  return artist.verificationStatus === "partial";
}

/** Portrait for display — verified, editorial, genre artwork, or neutral fallback. */
export function resolvePortrait(
  artist: Pick<Artist, "portrait" | "heroImage" | "genres" | "slug" | "spotifyArtistId"> & {
    image?: ArtistImage;
  }
): string {
  return resolveDisplayPortrait(artist);
}

export function resolveHeroImage(artist: Artist): string {
  const { portrait } = resolveArtistImage(artist, artist.image);
  const portraitUrl = preferRenderablePortraitUrl(artist, portrait);
  return resolveHeroDisplayUrl(artist, portraitUrl);
}

export function resolveHeroFallbacks(artist: Artist): string[] {
  const { portrait } = resolveArtistImage(artist, artist.image);
  const portraitUrl = preferRenderablePortraitUrl(artist, portrait);
  return resolveHeroDisplayFallbacks(artist, portraitUrl).slice(1);
}

export function resolvePortraitFallbacksForDisplay(
  artist: Pick<Artist, "portrait" | "heroImage" | "genres" | "slug" | "spotifyArtistId"> & {
    image?: ArtistImage;
  }
): string[] {
  const { portrait } = resolveArtistImage(artist as Artist, artist.image);
  const portraitUrl = preferRenderablePortraitUrl(artist as Artist, portrait);
  return buildPortraitDisplayFallbacks(
    artist as Artist,
    portraitUrl,
    resolvePortraitFallbacks(artist),
  ).slice(1);
}

export { resolvePortraitFallbacks };

/**
 * True when a YouTube ID is registered to a different artist in the research registry.
 * This is the only hard block for rendering embeds in the UI.
 */
export function isCrossArtistYoutubeEmbed(youtubeId: string, artistSlug: string): boolean {
  const owners = YOUTUBE_OWNERS.get(youtubeId);
  if (!owners) return false;
  return !owners.has(artistSlug);
}

export function youtubeIdAllowedForArtist(youtubeId: string, artistSlug: string): boolean {
  return !isCrossArtistYoutubeEmbed(youtubeId, artistSlug);
}

/** Default-on display: show unless clearly assigned to the wrong artist. */
export function shouldRenderSetEmbed(
  set: Pick<EssentialSet | ArchiveSet, "youtubeId" | "artistId"> & {
    artistSlug?: string;
  },
  currentArtistId: string,
  artistSlug?: string
): boolean {
  if (!set.youtubeId?.trim()) return false;
  const slug = artistSlug ?? set.artistSlug ?? currentArtistId;
  const ownerId = set.artistId ?? set.artistSlug;
  if (ownerId && ownerId !== currentArtistId && ownerId !== slug) return false;
  return !isCrossArtistYoutubeEmbed(set.youtubeId, slug);
}

/** @deprecated Use shouldRenderSetEmbed — kept as alias for catalog builders. */
export function canDisplaySet(
  set: Pick<EssentialSet | ArchiveSet, "youtubeId" | "artistId"> & { artistSlug?: string },
  currentArtistId: string,
  artistSlug?: string
): boolean {
  return shouldRenderSetEmbed(set, currentArtistId, artistSlug);
}

/** Default-on display: show tracks belonging to this artist. */
export function canDisplayTrack(
  track: Pick<Track, "artistId">,
  currentArtistId: string
): boolean {
  return track.artistId === currentArtistId;
}

/** Audit-only — requires verified metadata flag. Do not use for UI rendering. */
export function verifyTrackForArtist(
  track: Pick<Track, "artistId" | "verified">,
  currentArtistId: string
): boolean {
  if (!track.verified) return false;
  return track.artistId === currentArtistId;
}

/** Audit-only — requires verified metadata flag. Do not use for UI rendering. */
export function verifySetForArtist(
  set: Pick<EssentialSet | ArchiveSet, "verified" | "youtubeId" | "artistId"> & {
    artistSlug?: string;
  },
  currentArtistId: string
): boolean {
  if (!set.verified) return false;
  return shouldRenderSetEmbed(set, currentArtistId, set.artistSlug);
}

/** Audit-only. */
export function verifyCatalogTrackForArtist(
  track: Pick<CatalogTrack, "artistSlug" | "verified">,
  currentArtistId: string
): boolean {
  if (!track.verified) return false;
  return track.artistSlug === currentArtistId;
}

export function attachTrackVerification(
  artistSlug: string,
  track: Omit<Track, "id" | "artistId" | "verified">,
  status: VerificationStatus
): Track {
  const id = artistId(artistSlug);
  return {
    ...track,
    id: buildTrackId(artistSlug, track.title),
    artistId: id,
    verified: status === "verified",
  };
}

export function attachSetVerification(
  artistSlug: string,
  set: Omit<EssentialSet, "id" | "artistId" | "verified">,
  status: VerificationStatus
): EssentialSet {
  const id = artistId(artistSlug);
  const crossArtist = isCrossArtistYoutubeEmbed(set.youtubeId, artistSlug);
  const verified =
    !crossArtist && status === "verified" && isAllowedSetVenue(set.venue);
  return {
    ...set,
    id: buildSetId(artistSlug, set.title),
    artistId: id,
    verified,
  };
}

export function attachSetForDisplay(
  artistSlug: string,
  set: Omit<EssentialSet, "id" | "artistId" | "verified">
): EssentialSet | null {
  if (isCrossArtistYoutubeEmbed(set.youtubeId, artistSlug)) return null;
  const id = artistId(artistSlug);
  return {
    ...set,
    id: buildSetId(artistSlug, set.title),
    artistId: id,
    verified: false,
  };
}

export function filterDisplayTracks(artist: Artist): Track[] {
  const id = artistId(artist.slug);
  return artist.topTracks.filter((t) => canDisplayTrack(t, id));
}

export function filterDisplaySets(artist: Artist): EssentialSet[] {
  const id = artistId(artist.slug);
  return artist.essentialSets.filter((s) => shouldRenderSetEmbed(s, id, artist.slug));
}

export function filterVerifiedTracks(artist: Artist): Track[] {
  const id = artistId(artist.slug);
  return artist.topTracks.filter((t) => verifyTrackForArtist(t, id));
}

export function filterVerifiedSets(artist: Artist): EssentialSet[] {
  const id = artistId(artist.slug);
  return artist.essentialSets.filter((s) => verifySetForArtist(s, id));
}
