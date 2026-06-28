import type {
  Artist,
  EssentialSet,
  ExternalLinks,
  ListeningPathStep,
  Release,
  Track,
  VerificationStatus,
} from "@/types";
import type { CurationTier } from "@/lib/archive/curation/tiers";
import { trackCover } from "@/content/artists/track-covers";
import { sharedBio } from "@/content/artists/builder";
import { getResearchBySlug } from "@/content/artists/research";
import type { ArtistResearchRecord } from "@/content/artists/research/types";
import { fieldVerified } from "@/content/artists/research/types";
import { applyArtistImage, resolveArtistImage } from "@/lib/archive/images/apply";
import { researchImageToArtistImage } from "@/lib/archive/images/validate";
import { artistId } from "@/lib/archive/ids";
import {
  canDisplayTrack,
  youtubeIdAllowedForArtist,
} from "@/lib/archive/verification";
import { setId as buildSetId, trackId as buildTrackId } from "@/lib/music";
import {
  isAllowedSetVenue,
  isValidSpotifyTrackId,
  isValidYoutubeId,
  namesMatch,
  spotifyArtistUrl,
  spotifyTrackUrl,
} from "@/lib/archive/pipeline/validate";

function tierToStatus(tier: CurationTier): VerificationStatus {
  switch (tier) {
    case 1:
      return "verified";
    case 2:
      return "partial";
    case 3:
      return "unverified";
  }
}

function pendingBio(artist: Artist): boolean {
  return artist.editorialBio.origins.includes("pending verification");
}

function extractSpotifyTrackId(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/track\/([a-zA-Z0-9]{22})/);
  return match?.[1];
}

function buildImage(record?: ArtistResearchRecord) {
  if (!record?.image) return undefined;
  return researchImageToArtistImage(record.image, record.name);
}

function buildResearchLinks(record: ArtistResearchRecord): ExternalLinks {
  const links: ExternalLinks = {};
  if (record.spotify && fieldVerified(record.spotify.confidence)) {
    links.spotify = record.spotify.url;
  }
  if (record.instagram && fieldVerified(record.instagram.confidence)) {
    links.instagram = record.instagram.url;
  }
  if (record.soundcloud && fieldVerified(record.soundcloud.confidence)) {
    links.soundcloud = record.soundcloud.url;
  }
  if (record.youtube && fieldVerified(record.youtube.confidence)) {
    links.youtube = record.youtube.url;
  }
  if (record.residentAdvisor && fieldVerified(record.residentAdvisor.confidence)) {
    links.residentAdvisor = record.residentAdvisor.url;
  }
  return links;
}

function buildResearchTracks(record: ArtistResearchRecord): Track[] {
  const id = artistId(record.slug);
  return (record.tracks ?? [])
    .filter((t) => fieldVerified(t.confidence) && isValidSpotifyTrackId(t.spotifyTrackId))
    .map((t) => ({
      id: buildTrackId(record.slug, t.title),
      artistId: id,
      verified: true,
      title: t.title,
      year: t.year,
      duration: t.duration,
      coverArt: trackCover(spotifyTrackUrl(t.spotifyTrackId)),
      spotifyUrl: spotifyTrackUrl(t.spotifyTrackId),
    }));
}

function buildResearchSets(record: ArtistResearchRecord): EssentialSet[] {
  const id = artistId(record.slug);
  return (record.sets ?? [])
    .filter(
      (s) =>
        fieldVerified(s.confidence) &&
        isValidYoutubeId(s.youtubeId) &&
        youtubeIdAllowedForArtist(s.youtubeId, record.slug)
    )
    .map((s) => ({
      id: buildSetId(record.slug, s.title),
      artistId: id,
      verified: true,
      title: s.title,
      venue: s.venue,
      year: s.year,
      youtubeId: s.youtubeId,
    }));
}

function mergeSets(primary: EssentialSet[], secondary: EssentialSet[]): EssentialSet[] {
  const out: EssentialSet[] = [];
  const seenYoutube = new Set<string>();
  const seenId = new Set<string>();
  for (const s of [...secondary, ...primary]) {
    if (seenYoutube.has(s.youtubeId) || seenId.has(s.id)) continue;
    seenYoutube.add(s.youtubeId);
    seenId.add(s.id);
    out.push(s);
  }
  return out;
}

function mergeTracks(primary: Track[], secondary: Track[]): Track[] {
  const byId = new Map<string, Track>();
  for (const t of secondary) byId.set(t.id, t);
  for (const t of primary) byId.set(t.id, t);
  return [...byId.values()];
}

function buildListeningPath(tracks: Track[], sets: EssentialSet[]): ListeningPathStep[] {
  const path: ListeningPathStep[] = [];
  if (tracks[0]) path.push({ type: "track", title: tracks[0].title, note: "Start here" });
  if (sets[0]) path.push({ type: "set", title: sets[0].title });
  return path;
}

function buildReleases(tracks: Track[]): { eps: Release[]; singles: Release[] } {
  if (tracks.length === 0) return { eps: [], singles: [] };
  const cover = tracks[0].coverArt;
  return {
    eps: [{ title: `${tracks[0].title} EP`, year: tracks[0].year, coverArt: cover }],
    singles: [{ title: tracks[0].title, year: tracks[0].year, coverArt: cover }],
  };
}

/** Never strip — enrich metadata and verified portraits for all tiers. */
function enrichBase(artist: Artist): Artist {
  const { portrait, image } = resolveArtistImage(artist, artist.image);
  const externalLinks = { ...artist.externalLinks };
  if (artist.spotifyArtistId && !externalLinks.spotify) {
    externalLinks.spotify = spotifyArtistUrl(artist.spotifyArtistId);
  }

  const editorialBio = pendingBio(artist)
    ? sharedBio(artist.name, artist.city, artist.genres[0]?.replace(/-/g, " ") ?? "techno")
    : artist.editorialBio;

  const { eps, singles } =
    artist.eps.length || artist.singles.length
      ? { eps: artist.eps, singles: artist.singles }
      : buildReleases(artist.topTracks);

  const listeningPath =
    artist.listeningPath.length > 0
      ? artist.listeningPath
      : buildListeningPath(artist.topTracks, artist.essentialSets);

  return applyArtistImage({
    ...artist,
    portrait,
    heroImage: portrait,
    image,
    imageSource: image.verified ? "editorial" : "fallback",
    externalLinks,
    editorialBio,
    eps,
    singles,
    listeningPath,
  });
}

function applyTrackFlags(artist: Artist, strict: boolean): Track[] {
  const id = artistId(artist.slug);
  return artist.topTracks
    .filter((t) => canDisplayTrack(t, id))
    .map((t) => {
      if (!strict) return { ...t, verified: false };
      const trackId = extractSpotifyTrackId(t.spotifyUrl);
      const verified = !!trackId && isValidSpotifyTrackId(trackId);
      return { ...t, verified };
    });
}

function applySetFlags(artist: Artist, strict: boolean): EssentialSet[] {
  return artist.essentialSets
    .filter((s) => youtubeIdAllowedForArtist(s.youtubeId, artist.slug))
    .map((s) => {
      if (!strict) return { ...s, verified: false };
      const verified =
        isValidYoutubeId(s.youtubeId) &&
        isAllowedSetVenue(s.venue) &&
        youtubeIdAllowedForArtist(s.youtubeId, artist.slug);
      return { ...s, verified };
    });
}

function mergeResearch(artist: Artist, record: ArtistResearchRecord): Artist {
  const enriched = enrichBase(artist);
  const highImage = buildImage(record);
  const { portrait, image } = resolveArtistImage(enriched, highImage ?? enriched.image);

  const researchTracks = buildResearchTracks(record);
  const researchSets = buildResearchSets(record);
  const topTracks = mergeTracks(researchTracks, applyTrackFlags(enriched, true));
  const essentialSets = mergeSets(researchSets, applySetFlags(enriched, true));
  const externalLinks = { ...enriched.externalLinks, ...buildResearchLinks(record) };
  const spotifyArtistId =
    record.spotify && fieldVerified(record.spotify.confidence)
      ? record.spotify.artistId
      : enriched.spotifyArtistId;
  const { eps, singles } = buildReleases(topTracks);

  return applyArtistImage({
    ...enriched,
    name: record.name,
    country: record.country || enriched.country,
    genres: record.genres.length > 0 ? record.genres : enriched.genres,
    spotifyArtistId,
    externalLinks,
    topTracks,
    essentialSets,
    portrait,
    heroImage: portrait,
    image,
    imageSource: image.verified ? "editorial" : enriched.imageSource,
    eps: enriched.albums.length ? enriched.eps : eps,
    singles,
    listeningPath: buildListeningPath(topTracks, essentialSets),
  });
}

/** Tier 1 — full verification: research overrides + strict flags on catalog media. */
function applyTier1(artist: Artist): Artist {
  const research = getResearchBySlug(artist.slug);
  const base =
    research && namesMatch(research.name, artist.name)
      ? mergeResearch(artist, research)
      : {
          ...enrichBase(artist),
          topTracks: applyTrackFlags(artist, true),
          essentialSets: applySetFlags(artist, true),
        };

  return {
    ...base,
    curationTier: 1,
    verificationStatus: tierToStatus(1),
  };
}

/** Tier 2 — portrait, bio, genres; sets/tracks displayed at medium confidence. */
function applyTier2(artist: Artist): Artist {
  const base = enrichBase(artist);
  return {
    ...base,
    topTracks: applyTrackFlags(base, false),
    essentialSets: applySetFlags(base, false),
    curationTier: 2,
    verificationStatus: tierToStatus(2),
  };
}

/** Tier 3 — essential metadata; verified portraits only via registry. */
function applyTier3(artist: Artist): Artist {
  const base = enrichBase(artist);
  return {
    ...base,
    topTracks: applyTrackFlags(base, false),
    essentialSets: applySetFlags(base, false),
    curationTier: 3,
    verificationStatus: tierToStatus(3),
  };
}

export function applyCurationTier(artist: Artist, tier: CurationTier): Artist {
  switch (tier) {
    case 1:
      return applyTier1(artist);
    case 2:
      return applyTier2(artist);
    case 3:
      return applyTier3(artist);
  }
}

export { enrichBase, tierToStatus };
