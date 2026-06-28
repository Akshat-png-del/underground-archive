#!/usr/bin/env npx tsx
/**
 * Resolve Spotify artist IDs via oEmbed probe + MusicBrainz url-rels.
 * Writes data/ingestion/spotify-id-cache.json for portrait sync.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fetchJson, sleep } from "../src/lib/ingestion/http";
import { fetchSpotifyPortrait } from "../src/lib/ingestion/opengraph";
import { namesMatch } from "../src/lib/archive/pipeline/validate";
import { getArtistSeeds } from "../src/lib/ingestion/seeds";

const CACHE_PATH = join(process.cwd(), "data/ingestion/spotify-id-cache.json");

interface MbSearch {
  artists?: { id: string; name: string; score: number; disambiguation?: string }[];
}

interface MbArtist {
  name: string;
  relations?: { url?: { resource: string } }[];
}

async function spotifyIdFromMusicBrainz(name: string): Promise<string | null> {
  const q = encodeURIComponent(`artist:"${name}"`);
  await sleep(1100);
  const search = await fetchJson<MbSearch>(
    `https://musicbrainz.org/ws/2/artist?query=${q}&fmt=json&limit=5`,
    { provider: "musicbrainz" }
  );
  const artist = search.artists?.sort((a, b) => b.score - a.score)[0];
  if (!artist || !namesMatch(name, artist.name)) return null;

  await sleep(1100);
  const detail = await fetchJson<MbArtist>(
    `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=url-rels&fmt=json`,
    { provider: "musicbrainz" }
  );

  for (const rel of detail.relations ?? []) {
    const resource = rel.url?.resource ?? "";
    const match = resource.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]{22})/);
    if (match) return match[1];
  }
  return null;
}

async function verifySpotifyId(id: string, name: string): Promise<boolean> {
  const portrait = await fetchSpotifyPortrait(id);
  return !!portrait;
}

async function main() {
  const cache: Record<string, string> = existsSync(CACHE_PATH)
    ? (JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Record<string, string>)
    : {};

  const missing = [
    "psyk32", "petduo", "assemblage-23", "hante", "she-past-away", "lebanon-hanover",
    "drab-majesty", "rumina", "per-sona", "the-soft-moon", "rrose", "blawan", "ph87",
    "part-time-killer", "lucy", "victor-ruiz", "debora-alessio", "josh-wink", "ansome",
    "dave-the-drummer", "paranoid-london", "randomer", "hector-oaks", "len-d", "alex-bau",
    "weichentechnikk", "petra-flurr", "front-242", "deepbass", "norbak", "lft", "mcr-t",
  ];

  const seeds = getArtistSeeds();
  const bySlug = new Map(seeds.map((s) => [s.slug, s]));

  for (const slug of missing) {
    if (cache[slug]) continue;
    const seed = bySlug.get(slug);
    if (!seed) continue;

    console.log(`Resolving ${seed.name}…`);
    const id = await spotifyIdFromMusicBrainz(seed.name);
    if (id && (await verifySpotifyId(id, seed.name))) {
      cache[slug] = id;
      console.log(`  ✓ ${id}`);
    } else {
      console.log(`  – not found`);
    }
    await sleep(500);
  }

  mkdirSync(join(process.cwd(), "data/ingestion"), { recursive: true });
  writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  console.log(`\nCached ${Object.keys(cache).length} IDs → ${CACHE_PATH}`);
}

main();
