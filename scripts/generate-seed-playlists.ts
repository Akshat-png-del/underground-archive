/**
 * Generates SEED_PLAYLISTS from real Spotify catalog tracks.
 * Run: npx tsx scripts/generate-seed-playlists.ts
 *
 * Curates 6–10 mood-distinct playlists (30–50 tracks each) with minimal overlap.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { artists } from "../src/content/artists/all";
import { catalogTracks } from "../src/content/tracks/index";
import { isValidSpotifyTrackId } from "../src/lib/archive/pipeline/validate";
import type { CatalogTrack } from "../src/types/library";
import type { Genre } from "../src/types";

const PLAYLIST_SPECS: Array<{
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  prefer: Genre[];
  /** Track must match at least one of these genres (or preferredArtists). */
  requireAny: Genre[];
  /**
   * Optional secondary genres allowed only when the artist is not a pure
   * festival hard-techno / schranz / peak-time act.
   */
  allowSecondary?: Genre[];
  /** Reject artists who carry any of these genres (unless preferredArtists). */
  excludeAny?: Genre[];
  preferredArtists?: string[];
  sequence?: "rising" | "falling" | "chronological";
  count: number;
  softReuse?: boolean;
}> = [
  {
    id: "playlist-seed-14",
    title: "EBM Underground",
    description: "Electronic body music and machine rhythm from the industrial underground.",
    creatorId: "user-demo-3",
    creatorName: "industrial_dawn",
    likeCount: 286,
    createdAt: "2025-09-05T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["ebm", "industrial", "industrial-techno"],
    requireAny: ["ebm", "industrial"],
    allowSecondary: ["industrial-techno"],
    preferredArtists: ["phase-fatale", "adam-x", "ancient-methods", "boy-harsher", "orphx", "codex-empire"],
    count: 32,
  },
  {
    id: "playlist-seed-4",
    title: "Acid Assault",
    description: "Acid techno — corrosive 303 lines and warehouse heat.",
    creatorId: "user-demo-2",
    creatorName: "schranz_gym",
    likeCount: 267,
    createdAt: "2025-07-01T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["acid-techno", "hard-techno"],
    requireAny: ["acid-techno"],
    preferredArtists: ["regal", "999999999", "alignment", "ansome", "hector-oaks", "helena-hauff"],
    sequence: "rising",
    count: 32,
  },
  {
    id: "playlist-seed-6",
    title: "Schranz Reloaded",
    description: "Classic and modern schranz — loop-driven, relentless, physical.",
    creatorId: "user-demo-2",
    creatorName: "schranz_gym",
    likeCount: 356,
    createdAt: "2025-07-15T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["schranz", "hardgroove", "hard-techno"],
    requireAny: ["schranz", "hardgroove"],
    preferredArtists: ["regal", "klangkuenstler", "kobosil", "999999999", "hadone", "lft", "anetha"],
    count: 34,
  },
  {
    id: "playlist-seed-9",
    title: "Afterhours",
    description: "Hypnotic, deep, late-night techno for the hours after peak.",
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 278,
    createdAt: "2025-08-05T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["hypnotic-techno", "dark-techno", "industrial-techno"],
    requireAny: ["hypnotic-techno", "dark-techno", "industrial-techno"],
    preferredArtists: ["rrose", "lucy", "blawan", "randomer", "obscure-shape"],
    sequence: "falling",
    count: 32,
    /** Block festival peak / schranz from leaking into afterhours. */
    excludeAny: ["schranz", "peak-time-techno"],
  },
  {
    id: "playlist-seed-7",
    title: "Darkwave Nights",
    description: "Darkwave, post-punk electronics, and synth-driven night music.",
    creatorId: "user-demo-3",
    creatorName: "industrial_dawn",
    likeCount: 214,
    createdAt: "2025-07-20T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["darkwave", "ebm", "industrial"],
    requireAny: ["darkwave", "ebm", "industrial"],
    preferredArtists: ["boy-harsher", "phase-fatale", "adam-x", "orphx", "codex-empire"],
    sequence: "falling",
    count: 30,
    softReuse: true,
  },
  {
    id: "playlist-seed-2",
    title: "Industrial Darkness",
    description: "Industrial techno, EBM, and dark atmospheric floor weapons.",
    creatorId: "user-demo-3",
    creatorName: "industrial_dawn",
    likeCount: 298,
    createdAt: "2025-03-05T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["industrial-techno", "industrial", "ebm", "dark-techno"],
    requireAny: ["industrial-techno", "industrial", "ebm", "dark-techno"],
    preferredArtists: ["ancient-methods", "paula-temple", "perc", "phase-fatale", "adam-x", "rebekah"],
    count: 38,
  },
  {
    id: "playlist-seed-3",
    title: "Peak Time Chaos",
    description: "Festival peak-hour techno — high BPM, big rooms, no compromise.",
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 512,
    createdAt: "2025-06-01T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["peak-time-techno", "hard-techno", "schranz"],
    requireAny: ["peak-time-techno", "hard-techno"],
    preferredArtists: [
      "sara-landry",
      "trym",
      "charlie-sparks",
      "fantasm",
      "vtss",
      "dyen",
      "nico-moreno",
      "i-hate-models",
    ],
    sequence: "rising",
    count: 40,
  },
  {
    id: "playlist-seed-1",
    title: "Warehouse Energy",
    description: "Peak-time warehouse hard techno — pressure for concrete rooms.",
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 421,
    createdAt: "2025-05-01T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["hard-techno", "industrial-techno", "schranz"],
    requireAny: ["hard-techno", "schranz"],
    preferredArtists: [
      "kobosil",
      "sara-landry",
      "i-hate-models",
      "alignment",
      "klangkuenstler",
      "charlie-sparks",
      "hadone",
    ],
    count: 40,
  },
  {
    id: "playlist-seed-10",
    title: "Hard Techno Essentials",
    description: "Canonical hard techno selections — the archive's core sound.",
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 445,
    createdAt: "2025-08-10T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["hard-techno", "industrial-techno"],
    requireAny: ["hard-techno"],
    preferredArtists: [
      "sara-landry",
      "kobosil",
      "i-hate-models",
      "vtss",
      "alignment",
      "amelie-lens",
      "charlotte-de-witte",
    ],
    count: 40,
    softReuse: true,
  },
  {
    id: "playlist-seed-13",
    title: "Underground Archive Essentials",
    description: "The definitive introduction to The Underground Archive — a cross-section of the floor.",
    creatorId: "user-demo-1",
    creatorName: "warehouse_ghost",
    likeCount: 520,
    createdAt: "2025-09-01T12:00:00Z",
    updatedAt: "2026-07-22T12:00:00Z",
    prefer: ["hard-techno", "industrial-techno", "schranz", "ebm", "acid-techno", "darkwave"],
    requireAny: ["hard-techno", "industrial-techno", "schranz", "ebm", "acid-techno", "darkwave"],
    preferredArtists: [
      "sara-landry",
      "kobosil",
      "i-hate-models",
      "vtss",
      "regal",
      "boy-harsher",
      "ancient-methods",
      "paula-temple",
      "alignment",
      "klangkuenstler",
    ],
    sequence: "chronological",
    count: 42,
    softReuse: true,
  },
];

function artistGenres(slug: string): Set<Genre> {
  const artist = artists.find((a) => a.slug === slug);
  return new Set(artist?.genres ?? []);
}

function passesIdentityGate(
  track: CatalogTrack,
  requireAny: Genre[],
  preferredArtists: string[],
  allowSecondary: Genre[] = [],
  excludeAny: Genre[] = [],
): boolean {
  if (preferredArtists.includes(track.artistSlug)) return true;
  const genres = artistGenres(track.artistSlug);
  if (excludeAny.some((g) => genres.has(g))) return false;
  if (requireAny.some((g) => genres.has(g))) return true;
  if (!allowSecondary.some((g) => genres.has(g))) return false;
  // Secondary genres: skip festival hard-techno / schranz / peak / acid acts.
  if (
    genres.has("schranz") ||
    genres.has("peak-time-techno") ||
    genres.has("acid-techno") ||
    (genres.has("hard-techno") && !genres.has("ebm") && !genres.has("industrial"))
  ) {
    return false;
  }
  return true;
}

function artistBpm(track: CatalogTrack): number {
  const artist = artists.find((a) => a.slug === track.artistSlug);
  if (!artist) return 0;
  return (artist.bpmRange[0] + artist.bpmRange[1]) / 2;
}

function scoreTrack(
  track: CatalogTrack,
  prefer: Genre[],
  preferredArtists: string[] = [],
): number {
  const genres = artistGenres(track.artistSlug);
  let score = 0;
  prefer.forEach((g, i) => {
    if (genres.has(g)) score += (prefer.length - i) * 4;
  });
  const artistRank = preferredArtists.indexOf(track.artistSlug);
  if (artistRank >= 0) score += (preferredArtists.length - artistRank) * 3;
  // Verified boost only after a real genre/artist fit — never admit off-mood tracks.
  if (score > 0 && track.verified) score += 2;
  return score;
}

function spotifyId(track: CatalogTrack): string | undefined {
  const id = track.spotifyUrl.match(/\/track\/([A-Za-z0-9]{22})(?:[/?#]|$)/)?.[1];
  return id && isValidSpotifyTrackId(id) ? id : undefined;
}

/** One catalog ref per Spotify ID — catalog identity collisions must not inflate uniqueness. */
function uniqueBySpotifyId(pool: CatalogTrack[]): CatalogTrack[] {
  const bySpotify = new Map<string, CatalogTrack>();
  for (const track of [...pool].sort((a, b) => {
    // Prefer verified rows when the same Spotify ID appears twice.
    if (a.verified !== b.verified) return a.verified ? -1 : 1;
    return a.id.localeCompare(b.id);
  })) {
    const id = spotifyId(track);
    if (!id || bySpotify.has(id)) continue;
    bySpotify.set(id, track);
  }
  return [...bySpotify.values()];
}

function pickTracks(
  pool: CatalogTrack[],
  prefer: Genre[],
  preferredArtists: string[],
  requireAny: Genre[],
  allowSecondary: Genre[],
  excludeAny: Genre[],
  count: number,
  usedGlobal: Map<string, number>,
  softReuse: boolean,
): CatalogTrack[] {
  const maxReuse = softReuse ? 2 : 1;

  const ranked = pool
    .map((t) => {
      const sid = spotifyId(t)!;
      return {
        t,
        sid,
        score: scoreTrack(t, prefer, preferredArtists),
        reuse: usedGlobal.get(sid) ?? 0,
      };
    })
    .filter(
      (x) =>
        x.score > 0 &&
        x.reuse < maxReuse &&
        passesIdentityGate(x.t, requireAny, preferredArtists, allowSecondary, excludeAny),
    )
    .sort(
      (a, b) =>
        a.reuse - b.reuse ||
        b.score - a.score ||
        a.t.id.localeCompare(b.t.id),
    );

  const picked: CatalogTrack[] = [];
  const seenSpotify = new Set<string>();
  const byArtist = new Map<string, typeof ranked>();
  for (const row of ranked) {
    const group = byArtist.get(row.t.artistSlug) ?? [];
    group.push(row);
    byArtist.set(row.t.artistSlug, group);
  }

  // Round-robin artists so a playlist feels curated, not like concatenated discographies.
  const artistGroups = [...byArtist.values()].sort(
    (a, b) =>
      (a[0]?.reuse ?? 0) - (b[0]?.reuse ?? 0) ||
      (b[0]?.score ?? 0) - (a[0]?.score ?? 0) ||
      (a[0]?.t.artistSlug ?? "").localeCompare(b[0]?.t.artistSlug ?? ""),
  );
  let pass = 0;
  while (picked.length < count) {
    let added = false;
    for (const group of artistGroups) {
      const row = group[pass];
      if (!row || seenSpotify.has(row.sid)) continue;
      // Prefer unused tracks in early passes.
      if (pass === 0 && row.reuse > 0 && !softReuse) continue;
      seenSpotify.add(row.sid);
      picked.push(row.t);
      added = true;
      if (picked.length >= count) break;
    }
    if (!added) break;
    pass += 1;
  }

  if (picked.length < count) {
    for (const row of ranked) {
      if (picked.length >= count) break;
      if (seenSpotify.has(row.sid)) continue;
      seenSpotify.add(row.sid);
      picked.push(row.t);
    }
  }

  for (const t of picked) {
    const sid = spotifyId(t)!;
    usedGlobal.set(sid, (usedGlobal.get(sid) ?? 0) + 1);
  }

  return picked;
}

function sequenceTracks(
  tracks: CatalogTrack[],
  sequence: "rising" | "falling" | "chronological" = "rising",
): CatalogTrack[] {
  return [...tracks].sort((a, b) => {
    if (sequence === "chronological") {
      return a.releaseYear - b.releaseYear || a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title);
    }
    const bpmDelta = artistBpm(a) - artistBpm(b);
    const orderedBpm = sequence === "falling" ? -bpmDelta : bpmDelta;
    return orderedBpm || a.releaseYear - b.releaseYear || a.artist.localeCompare(b.artist);
  });
}

function stableItemId(playlistId: string, refId: string, order: number): string {
  return `${playlistId}-${order}-${refId.replace(/[^a-z0-9]+/gi, "-")}`;
}

if (PLAYLIST_SPECS.length < 6 || PLAYLIST_SPECS.length > 10) {
  throw new Error(`Expected 6–10 playlist specs, got ${PLAYLIST_SPECS.length}`);
}

const verified = uniqueBySpotifyId(catalogTracks.filter((track) => spotifyId(track)));
const usedGlobal = new Map<string, number>();

const playlists = PLAYLIST_SPECS.map((spec) => {
  const tracks = sequenceTracks(
    pickTracks(
      verified,
      spec.prefer,
      spec.preferredArtists ?? [],
      spec.requireAny,
      spec.allowSecondary ?? [],
      spec.excludeAny ?? [],
      spec.count,
      usedGlobal,
      spec.softReuse ?? false,
    ),
    spec.sequence,
  );
  if (tracks.length < 30) {
    throw new Error(`${spec.title}: only ${tracks.length} tracks (need ≥30)`);
  }
  if (tracks.length > 50) {
    throw new Error(`${spec.title}: ${tracks.length} tracks (maximum 50)`);
  }
  if (new Set(tracks.map((track) => track.id)).size !== tracks.length) {
    throw new Error(`${spec.title}: duplicate track refs`);
  }
  const spotifyIds = tracks.map((track) => spotifyId(track));
  if (spotifyIds.some((id) => !id)) {
    throw new Error(`${spec.title}: includes a track without a valid Spotify track ID`);
  }
  if (new Set(spotifyIds).size !== spotifyIds.length) {
    throw new Error(`${spec.title}: duplicate Spotify track IDs`);
  }

  return {
    ...spec,
    coverImage: tracks[0]?.coverArt ?? "",
    isPublic: true,
    items: tracks.map((t, order) => ({
      id: stableItemId(spec.id, t.id, order),
      type: "track" as const,
      refId: t.id,
      order,
      addedAt: spec.createdAt,
    })),
  };
});

// Overlap report — each pair should stay well below 30% shared tracks.
const idSets = playlists.map((p) => ({
  title: p.title,
  ids: new Set(p.items.map((i) => i.refId)),
}));
let maxPairOverlap = 0;
let maxPairLabel = "";
for (let i = 0; i < idSets.length; i++) {
  for (let j = i + 1; j < idSets.length; j++) {
    let shared = 0;
    for (const id of idSets[i].ids) {
      if (idSets[j].ids.has(id)) shared += 1;
    }
    const denom = Math.min(idSets[i].ids.size, idSets[j].ids.size);
    const ratio = shared / denom;
    if (ratio > maxPairOverlap) {
      maxPairOverlap = ratio;
      maxPairLabel = `${idSets[i].title} ↔ ${idSets[j].title} (${shared}/${denom})`;
    }
  }
}
if (maxPairOverlap > 0.4) {
  throw new Error(`Excessive playlist overlap: ${maxPairLabel} = ${(maxPairOverlap * 100).toFixed(1)}%`);
}

const outPath = join(process.cwd(), "src/lib/library/seed-playlists.generated.ts");
const body = `/* AUTO-GENERATED by scripts/generate-seed-playlists.ts — do not edit by hand */
import type { Playlist } from "@/types/library";

export const SEED_PLAYLISTS: Playlist[] = ${JSON.stringify(
  playlists.map((playlist) => ({
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    coverImage: playlist.coverImage,
    isPublic: playlist.isPublic,
    creatorId: playlist.creatorId,
    creatorName: playlist.creatorName,
    likeCount: playlist.likeCount,
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
    items: playlist.items,
  })),
  null,
  2,
)};
`;

writeFileSync(outPath, body);
console.log(
  "Wrote",
  outPath,
  `\n${playlists.length} playlists · max pairwise overlap ${(maxPairOverlap * 100).toFixed(1)}% (${maxPairLabel})`,
);
console.log(playlists.map((p) => `  ${p.title}: ${p.items.length}`).join("\n"));
