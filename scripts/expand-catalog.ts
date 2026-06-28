#!/usr/bin/env npx tsx
/**
 * Deep catalog expansion — Spotify discography + YouTube set search.
 * Usage: npm run expand:catalog [-- slug]
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getArtistSeeds } from "../src/lib/ingestion/seeds";
import { getCurationTier } from "../src/lib/archive/curation/tiers";
import type { CatalogExpansion } from "../src/lib/catalog/types";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists } from "../src/content/artists/catalog-expansion";
import { scrapeSpotifyDiscography } from "./lib/spotify-scrape";
import { buildSetSearchQueries, searchYoutubeSets } from "./lib/youtube-scrape";
import { sleep } from "../src/lib/ingestion/http";
import { isAllowedSetVenue } from "../src/lib/archive/pipeline/validate";

const OUT_DIR = join(process.cwd(), "data/catalog-expansion");

const allRaw = [
  ...coreArtists,
  ...catalogArtists,
  ...bulkCatalogArtists,
  ...expansionCatalogArtists,
];

function trackMinimum(tier: 1 | 2 | 3): number {
  if (tier === 1) return 12;
  if (tier === 2) return 7;
  return 4;
}

function setMinimum(tier: 1 | 2 | 3): number {
  if (tier === 1) return 5;
  if (tier === 2) return 2;
  return 0;
}

function loadExisting(slug: string): CatalogExpansion | null {
  const path = join(OUT_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CatalogExpansion;
  } catch {
    return null;
  }
}

async function expandArtist(slug: string): Promise<void> {
  const seed = getArtistSeeds().find((s) => s.slug === slug);
  const raw = allRaw.find((a) => a.slug === slug);
  if (!seed || !raw) {
    console.log(`– ${slug}: not found`);
    return;
  }

  const tier = getCurationTier(slug);
  const minTracks = trackMinimum(tier);
  const minSets = setMinimum(tier);
  const existing = loadExisting(slug);
  const existingTrackIds = new Set(existing?.tracks.map((t) => t.spotifyTrackId) ?? []);
  const existingSetIds = new Set(existing?.sets.map((s) => s.youtubeId) ?? []);

  // Also preserve tracks/sets already on the artist object
  for (const t of raw.topTracks ?? []) {
    const id = t.spotifyUrl?.match(/\/track\/([a-zA-Z0-9]{22})/)?.[1];
    if (id) existingTrackIds.add(id);
  }
  for (const s of raw.essentialSets ?? []) {
    existingSetIds.add(s.youtubeId);
  }

  const tracks = [...(existing?.tracks ?? [])];
  const sets = [...(existing?.sets ?? [])];

  const spotifyId = raw.spotifyArtistId ?? seed.spotifyArtistId;
  if (spotifyId && tracks.length < minTracks) {
    const maxFetch = tier === 1 ? 20 : tier === 2 ? 12 : 8;
    const scraped = await scrapeSpotifyDiscography(spotifyId, seed.name, maxFetch);
    for (const t of scraped) {
      if (tracks.some((x) => x.spotifyTrackId === t.id)) continue;
      if (existingTrackIds.has(t.id)) continue;
      tracks.push({
        title: t.title,
        spotifyTrackId: t.id,
        year: t.year,
        duration: t.duration,
      });
      if (tracks.length >= maxFetch) break;
    }
    await sleep(300);
  }

  if (minSets > 0 && sets.length < minSets) {
    const queries = buildSetSearchQueries(seed.name);
    const found = await searchYoutubeSets(seed.name, queries, minSets, existingSetIds);
    for (const s of found) {
      if (sets.some((x) => x.youtubeId === s.youtubeId)) continue;
      sets.push({
        title: s.title,
        venue: s.venue,
        year: s.year,
        youtubeId: s.youtubeId,
      });
    }
  }

  const expansion: CatalogExpansion = {
    slug,
    tracks,
    sets: sets.filter((s) => isAllowedSetVenue(s.venue)),
    updatedAt: new Date().toISOString(),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${slug}.json`), `${JSON.stringify(expansion, null, 2)}\n`, "utf8");
  console.log(
    `✓ ${slug} [T${tier}] — ${tracks.length} tracks, ${sets.length} sets`
  );
}

async function main() {
  const onlySlug = process.argv[2];
  const seeds = onlySlug
    ? getArtistSeeds().filter((s) => s.slug === onlySlug)
    : getArtistSeeds();

  if (onlySlug && seeds.length === 0) {
    console.error(`Unknown slug: ${onlySlug}`);
    process.exit(1);
  }

  console.log(`Expanding catalog for ${seeds.length} artists…\n`);

  for (const seed of seeds) {
    try {
      await expandArtist(seed.slug);
    } catch (err) {
      console.error(`✗ ${seed.slug}:`, err instanceof Error ? err.message : err);
    }
    await sleep(500);
  }

  execSync("npx tsx scripts/build-expansion-bundle.ts", { stdio: "inherit" });
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
