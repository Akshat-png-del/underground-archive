import type { Artist, EssentialSet, Genre, MoodTag, Track, VerificationStatus } from "@/types";
import { artistId } from "@/lib/archive/ids";
import { FALLBACK_IMAGE } from "@/lib/archive/schema";
import {
  attachSetVerification,
  attachTrackVerification,
  youtubeIdAllowedForArtist,
} from "@/lib/archive/verification";
import { getGenreArtwork } from "@/lib/archive/genre-artwork";
import { ytThumb } from "@/lib/images";
import { scdn, trackCover } from "@/content/artists/track-covers";

export type TrackSeed = Omit<Track, "id" | "artistId" | "verified">;
export type EssentialSetSeed = Omit<EssentialSet, "id" | "artistId" | "verified">;

export type ArtistSeed = Omit<
  Artist,
  "id" | "portrait" | "heroImage" | "image" | "imageSource" | "curationTier" | "topTracks" | "essentialSets"
> & {
  imageVideoId?: string;
  portraitCover?: string;
  topTracks: TrackSeed[];
  essentialSets: EssentialSetSeed[];
};

export function buildArtist(seed: ArtistSeed): Artist {
  const id = artistId(seed.slug);

  const topTracks = seed.topTracks.map((t) =>
    attachTrackVerification(seed.slug, t, seed.verificationStatus)
  );

  const essentialSets = seed.essentialSets.map((s) =>
    attachSetVerification(seed.slug, s, seed.verificationStatus)
  );

  const genreArt = getGenreArtwork(seed.genres[0]);
  let portrait = genreArt;
  let image: Artist["image"] = {
    url: genreArt,
    source: "fallback",
    sourceType: "editorial-publication",
    verified: false,
  };

  if (seed.portraitCover) {
    portrait = seed.portraitCover;
    image = { url: portrait, source: "label-press", sourceType: "label-press", verified: false };
  } else if (
    seed.imageVideoId &&
    youtubeIdAllowedForArtist(seed.imageVideoId, seed.slug)
  ) {
    portrait = ytThumb(seed.imageVideoId, "hq");
    image = { url: portrait, source: "festival-press", sourceType: "festival-press", verified: false };
  }

  return {
    ...seed,
    id,
    curationTier: 3,
    topTracks,
    essentialSets,
    portrait,
    heroImage: portrait,
    image,
    imageSource: "fallback",
  };
}

export const sharedBio = (name: string, city: string, genre: string) => ({
  origins: `${name} emerged from ${city}'s underground electronic scene, drawn to ${genre} for its uncompromising intensity and cultural authenticity.`,
  earlyCareer: `Warehouse residencies and local label releases built a reputation for marathon sets and precise selection before any festival spotlight.`,
  breakthrough: `International festival appearances and a viral live recording brought global attention without diluting the underground ethos.`,
  soundEvolution: `Productions grew more refined while retaining the physical impact that defined early work — always dancefloor-first.`,
  presentDay: `Today ${name} tours internationally while remaining rooted in the scenes that shaped them, releasing on labels that share their vision.`,
});

export interface CatalogTrack {
  title: string;
  year: number;
  duration: string;
  spotifyTrackId?: string;
  coverHash?: string;
  verified?: boolean;
}

export interface CatalogEntry {
  slug: string;
  name: string;
  country: string;
  city: string;
  scene: string;
  activeSince: number;
  genres: Genre[];
  verificationStatus?: VerificationStatus;
  spotifyArtistId?: string;
  labels?: string[];
  imageVideoId?: string;
  portraitCover?: string;
  bpmRange?: [number, number];
  soundScores?: Artist["soundScores"];
  moodTags?: MoodTag[];
  similarArtists?: string[];
  tracks?: CatalogTrack[];
  sets?: { title: string; venue: string; year: number; youtubeId: string }[];
  externalLinks?: Artist["externalLinks"];
  editorialBio?: Artist["editorialBio"];
  signatureSound?: Artist["signatureSound"];
  visualIdentity?: string;
  trending?: boolean;
  featured?: boolean;
}

function hashScores(slug: string): Artist["soundScores"] {
  let n = 0;
  for (const c of slug) n += c.charCodeAt(0);
  const v = (base: number) => Math.round((base + (n % 7) * 0.1) * 10) / 10;
  return {
    energy: v(8.8),
    darkness: v(8.2),
    aggression: v(8.5),
    industrial: v(8.0),
    melody: v(4.5),
  };
}

export function createCatalogArtist(entry: CatalogEntry): Artist {
  const status = entry.verificationStatus ?? (entry.spotifyArtistId ? "partial" : "unverified");
  const verified = status === "verified";
  const hasMedia = verified || status === "partial";

  const links: Artist["externalLinks"] = {};
  if (entry.externalLinks) {
    Object.assign(links, entry.externalLinks);
  } else if (entry.spotifyArtistId) {
    links.spotify = `https://open.spotify.com/artist/${entry.spotifyArtistId}`;
  }

  const trackStatus = verified ? "verified" : "partial";

  const topTracks =
    entry.tracks?.length
      ? entry.tracks
          .filter((t) => t.verified !== false)
          .map((t) =>
            attachTrackVerification(
              entry.slug,
              {
                title: t.title,
                year: t.year,
                duration: t.duration,
                coverArt: t.coverHash
                  ? scdn(t.coverHash)
                  : t.spotifyTrackId
                    ? trackCover(`https://open.spotify.com/track/${t.spotifyTrackId}`)
                    : getGenreArtwork(entry.genres[0]),
                spotifyUrl: t.spotifyTrackId
                  ? `https://open.spotify.com/track/${t.spotifyTrackId}`
                  : undefined,
              },
              trackStatus
            )
          )
      : [];

  const essentialSets =
    entry.sets?.length
      ? entry.sets
          .filter((s) => youtubeIdAllowedForArtist(s.youtubeId, entry.slug))
          .map((s) => attachSetVerification(entry.slug, s, verified ? "verified" : "partial"))
      : [];

  const portraitCover = entry.portraitCover;
  const imageVideoId =
    entry.imageVideoId && youtubeIdAllowedForArtist(entry.imageVideoId, entry.slug)
      ? entry.imageVideoId
      : undefined;

  const epCover = topTracks[0]?.coverArt ?? getGenreArtwork(entry.genres[0]);

  return buildArtist({
    slug: entry.slug,
    name: entry.name,
    verificationStatus: status,
    spotifyArtistId: entry.spotifyArtistId,
    imageVideoId,
    portraitCover,
    country: entry.country,
    city: entry.city,
    scene: entry.scene,
    activeSince: entry.activeSince,
    genres: entry.genres,
    labels: entry.labels ?? [],
    collectives: [],
    externalLinks: links,
    bpmRange: entry.bpmRange ?? [140, 150],
    soundScores: entry.soundScores ?? hashScores(entry.slug),
    moodTags: entry.moodTags ?? ["dark", "hypnotic", "aggressive", "industrial"],
    editorialBio:
      entry.editorialBio ??
      sharedBio(entry.name, entry.city, entry.genres[0]?.replace(/-/g, " ") ?? "techno"),
    signatureSound: entry.signatureSound ?? {
      productionStyle: "Driving percussion, industrial textures, warehouse-tested arrangement",
      atmosphere: "Physical, uncompromising, built for peak-time rooms",
      influences: ["Industrial techno", "EBM", "90s rave"],
    },
    topTracks,
    albums: [],
    eps:
      topTracks.length
        ? [{ title: `${topTracks[0].title} EP`, year: topTracks[0].year, coverArt: epCover }]
        : [],
    singles:
      topTracks.length
        ? topTracks.slice(0, 1).map((t) => ({
            title: t.title,
            year: topTracks[0].year,
            coverArt: t.coverArt,
          }))
        : [],
    essentialSets,
    listeningPath:
      topTracks.length
        ? [
            { type: "track" as const, title: topTracks[0].title },
            ...(essentialSets[0] ? [{ type: "set" as const, title: essentialSets[0].title }] : []),
          ]
        : [],
    similarArtists: entry.similarArtists ?? [],
    careerTimeline: [
      { year: entry.activeSince, event: `${entry.city} — active since ${entry.activeSince}` },
      ...(hasMedia
        ? [
            { year: entry.activeSince + 5, event: "International recognition" },
            { year: 2024, event: "Global touring circuit" },
          ]
        : []),
    ],
    ratings: {
      energy: entry.soundScores?.energy ?? hashScores(entry.slug).energy,
      darkness: entry.soundScores?.darkness ?? hashScores(entry.slug).darkness,
      intensity: 8.8,
      innovation: 8.2,
      dancefloorImpact: 8.9,
      count: 0,
    },
    trending: entry.trending,
    featured: entry.featured,
    visualIdentity:
      entry.visualIdentity ??
      `Monochrome press shots, harsh contrast, warehouse lighting — the visual language of ${entry.city}'s ${entry.genres[0]?.replace(/-/g, " ") ?? "techno"} scene.`,
  });
}
