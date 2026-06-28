import { artists } from "@/content/artists/all";
import type { CatalogRelease, CatalogTrack } from "@/types/library";
import { artistId } from "@/lib/archive/ids";
import { canDisplayTrack } from "@/lib/archive/verification";
import { releaseId, trackId } from "@/lib/music";

function toCatalogTrack(
  artistSlug: string,
  artistName: string,
  soundcloudUrl: string | undefined,
  track: (typeof artists)[0]["topTracks"][0]
): CatalogTrack {
  const id = artistId(artistSlug);
  return {
    id: trackId(artistSlug, track.title),
    title: track.title,
    artist: artistName,
    artistSlug,
    artistId: id,
    verified: track.verified,
    duration: track.duration,
    releaseYear: track.year,
    coverArt: track.coverArt,
    spotifyUrl: track.spotifyUrl ?? "",
    youtubeUrl: track.youtubeUrl,
    soundcloudUrl,
  };
}

export const catalogTracks: CatalogTrack[] = artists.flatMap((artist) =>
  artist.topTracks
    .filter((t) => canDisplayTrack(t, artist.id))
    .map((t) => toCatalogTrack(artist.slug, artist.name, artist.externalLinks.soundcloud, t))
);

export const catalogReleases: CatalogRelease[] = artists.flatMap((artist) => {
  if (
    artist.topTracks.length === 0 &&
    artist.albums.length === 0 &&
    artist.eps.length === 0 &&
    artist.singles.length === 0
  ) {
    return [];
  }
  const mapRelease = (
    r: { title: string; year: number; coverArt: string; label?: string; spotifyUrl?: string },
    type: CatalogRelease["type"]
  ): CatalogRelease => ({
    id: releaseId(artist.slug, r.title, type),
    title: r.title,
    artist: artist.name,
    artistSlug: artist.slug,
    year: r.year,
    coverArt: r.coverArt,
    label: r.label,
    spotifyUrl: r.spotifyUrl ?? artist.externalLinks.spotify,
    type,
  });
  return [
    ...artist.albums.map((r) => mapRelease(r, "album")),
    ...artist.eps.map((r) => mapRelease(r, "ep")),
    ...artist.singles.map((r) => mapRelease(r, "single")),
  ];
});

export function getTrack(id: string): CatalogTrack | undefined {
  return catalogTracks.find((t) => t.id === id);
}

export function getRelease(id: string): CatalogRelease | undefined {
  return catalogReleases.find((r) => r.id === id);
}

export function getTracksByArtist(slug: string): CatalogTrack[] {
  const id = artistId(slug);
  const fromCatalog = catalogTracks.filter((t) => t.artistId === id);
  if (fromCatalog.length > 0) return fromCatalog;

  const artist = artists.find((a) => a.slug === slug);
  if (!artist) return [];

  return artist.topTracks
    .filter((t) => canDisplayTrack(t, id))
    .map((t) => toCatalogTrack(slug, artist.name, artist.externalLinks.soundcloud, t));
}

export function getPopularTracksByArtist(slug: string): CatalogTrack[] {
  return getTracksByArtist(slug);
}

export function getLatestReleasesByArtist(slug: string, limit = 6): CatalogRelease[] {
  return catalogReleases
    .filter((r) => r.artistSlug === slug)
    .sort((a, b) => b.year - a.year)
    .slice(0, limit);
}

export function getRecommendedTracks(seedArtistSlug: string, limit = 6): CatalogTrack[] {
  const artist = artists.find((a) => a.slug === seedArtistSlug);
  if (!artist) return catalogTracks.slice(0, limit);
  const similar = new Set(artist.similarArtists);
  return catalogTracks
    .filter((t) => similar.has(t.artistSlug))
    .slice(0, limit);
}

export function getVerifiedTracks(): CatalogTrack[] {
  return catalogTracks.filter((t) => t.verified);
}

/** All displayable tracks — default for UI (not gated on verified metadata). */
export function getDisplayTracks(): CatalogTrack[] {
  return catalogTracks;
}
