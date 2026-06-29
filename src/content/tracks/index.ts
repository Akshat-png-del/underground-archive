import { artists } from "@/content/artists/all";
import type { CatalogRelease, CatalogTrack } from "@/types/library";
import { artistId } from "@/lib/archive/ids";
import { canDisplayTrack } from "@/lib/archive/verification";
import { isValidSpotifyTrackId, spotifyTrackUrl } from "@/lib/archive/pipeline/validate";
import { releaseId, trackId } from "@/lib/music";

function catalogSpotifyUrl(track: { spotifyUrl?: string; spotifyTrackId?: string }): string {
  const url = track.spotifyUrl?.trim();
  if (url?.includes("/track/")) return url;
  const id = track.spotifyTrackId?.trim();
  if (id && isValidSpotifyTrackId(id)) return spotifyTrackUrl(id);
  return url ?? "";
}

function toCatalogTrack(
  artistSlug: string,
  artistName: string,
  soundcloudUrl: string | undefined,
  track: (typeof artists)[0]["topTracks"][0] & { spotifyTrackId?: string }
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
    spotifyUrl: catalogSpotifyUrl(track),
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

/** Stable ordering for SSR/client parity — title, then year, then id. */
export function sortCatalogTracksDeterministic(tracks: CatalogTrack[]): CatalogTrack[] {
  return [...tracks].sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title, "en", { sensitivity: "base" });
    if (byTitle !== 0) return byTitle;
    const byYear = a.releaseYear - b.releaseYear;
    if (byYear !== 0) return byYear;
    return a.id.localeCompare(b.id, "en", { sensitivity: "base" });
  });
}

export function getTracksByArtist(slug: string): CatalogTrack[] {
  const id = artistId(slug);
  const artist = artists.find((a) => a.slug === slug);
  if (!artist) return [];

  const byId = new Map(
    catalogTracks.filter((t) => t.artistId === id).map((t) => [t.id, t] as const),
  );

  // Preserve canonical editorial order from artist.topTracks (never shuffle/randomize).
  const ordered: CatalogTrack[] = [];
  for (const t of artist.topTracks) {
    const catalog = byId.get(t.id);
    if (catalog) {
      ordered.push(catalog);
      byId.delete(t.id);
    }
  }

  const rest = sortCatalogTracksDeterministic([...byId.values()]);
  return [...ordered, ...rest];
}

export function getRelease(id: string): CatalogRelease | undefined {
  return catalogReleases.find((r) => r.id === id);
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
  if (!artist) return sortCatalogTracksDeterministic(catalogTracks).slice(0, limit);
  const similar = new Set(artist.similarArtists);
  return sortCatalogTracksDeterministic(
    catalogTracks.filter((t) => similar.has(t.artistSlug)),
  ).slice(0, limit);
}

export function getVerifiedTracks(): CatalogTrack[] {
  return catalogTracks.filter((t) => t.verified);
}

/** All displayable tracks — default for UI (not gated on verified metadata). */
export function getDisplayTracks(): CatalogTrack[] {
  return catalogTracks;
}
