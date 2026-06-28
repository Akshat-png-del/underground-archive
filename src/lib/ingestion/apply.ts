import type { Artist } from "@/types";
import { getResearchBySlug } from "@/content/artists/research";
import { fieldVerified } from "@/content/artists/research/types";
import { getIngestedMetadata } from "@/content/artists/metadata";
import { mapExternalGenres } from "./genres";

function hasManualSpotify(research: ReturnType<typeof getResearchBySlug>): boolean {
  return !!(research?.spotify && fieldVerified(research.spotify.confidence));
}

function hasManualYoutube(research: ReturnType<typeof getResearchBySlug>): boolean {
  return !!(research?.youtube && fieldVerified(research.youtube.confidence));
}

function hasManualImage(research: ReturnType<typeof getResearchBySlug>): boolean {
  return !!(research?.image && fieldVerified(research.image.confidence));
}

/**
 * Merge API-ingested metadata into an artist.
 * Manual research/records.ts always wins on conflicting fields.
 */
export function applyIngestedMetadata(artist: Artist): Artist {
  const ingested = getIngestedMetadata(artist.slug);
  if (!ingested) return artist;

  const research = getResearchBySlug(artist.slug);
  const externalLinks = { ...artist.externalLinks };

  const spotifyArtistId = hasManualSpotify(research)
    ? artist.spotifyArtistId
    : ingested.spotify?.artistId ?? artist.spotifyArtistId;

  if (!hasManualSpotify(research) && ingested.spotify?.url) {
    externalLinks.spotify = ingested.spotify.url;
  }

  if (!hasManualYoutube(research) && ingested.youtube?.channelUrl) {
    externalLinks.youtube = ingested.youtube.channelUrl;
  }

  const mappedGenres = ingested.spotify?.genres?.length
    ? mapExternalGenres(ingested.spotify.genres)
    : [];

  const genres =
    mappedGenres.length > 0 && artist.genres.length <= 1
      ? [...new Set([...artist.genres, ...mappedGenres])]
      : artist.genres;

  const similarArtists =
    artist.similarArtists.length > 0
      ? artist.similarArtists
      : (ingested.relatedArtistSlugs ?? []);

  let portrait = artist.portrait;
  let image = artist.image;

  if (!hasManualImage(research) && ingested.resolvedImage?.url) {
    const src = ingested.resolvedImage.source;
    const sourceType =
      src === "spotify"
        ? "spotify"
        : src === "beatport"
          ? "beatport"
          : src === "resident-advisor"
            ? "resident-advisor"
            : src === "discogs" || src === "musicbrainz"
              ? "editorial-publication"
              : "official-website";

    portrait = ingested.resolvedImage.url;
    image = {
      url: ingested.resolvedImage.url,
      source:
        src === "spotify"
          ? "spotify"
          : src === "youtube"
            ? "official-website"
            : "official-website",
      sourceType,
      verified: false,
      imageSource: ingested.resolvedImage.sourceUrl,
      attribution: `${src} — ${ingested.name}`,
    };
  }

  return {
    ...artist,
    name: ingested.spotify?.name ?? artist.name,
    spotifyArtistId,
    externalLinks,
    genres,
    similarArtists,
    portrait,
    heroImage: portrait,
    image,
    imageSource: image.verified ? "editorial" : "fallback",
  };
}
