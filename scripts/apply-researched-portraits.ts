#!/usr/bin/env npx tsx
/**
 * Apply HIGH-confidence researched portraits to ingestion metadata.
 * Downloads missing local assets, updates per-artist JSON, rebuilds bundle.
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  RESEARCHED_VERIFIED_PORTRAITS,
  VERIFIED_SPOTIFY_ARTIST_IDS,
  researchedPortraitPath,
} from "../src/content/artists/images/researched-portraits";
import {
  loadOrCreateMetadata,
  writeArtistMetadata,
} from "../src/lib/ingestion/store";
import { fetchSpotifyPortrait, fetchOpenGraphImage } from "../src/lib/ingestion/opengraph";
import type { IngestedPortraitSource } from "../src/lib/ingestion/types";
import { getArtistSeeds } from "../src/lib/ingestion/seeds";

const PORTRAIT_DIR = join(process.cwd(), "public/images/portraits/researched");
const RESEARCH_DIR = join(process.cwd(), "data/portrait-research");
const MIN_BYTES = 500;

const PORTRAIT_BY_SLUG = new Map(
  RESEARCHED_VERIFIED_PORTRAITS.map((record) => [record.slug, record])
);

function absFromPublicPath(publicPath: string): string {
  return join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

async function downloadImage(slug: string, imageUrl: string): Promise<boolean> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "UndergroundArchive/1.0 (portrait-apply)" },
      redirect: "follow",
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_BYTES) return false;
    mkdirSync(PORTRAIT_DIR, { recursive: true });
    writeFileSync(join(PORTRAIT_DIR, `${slug}.jpg`), buf);
    return true;
  } catch {
    return false;
  }
}

function researchImageUrl(slug: string): string | undefined {
  const path = join(RESEARCH_DIR, `${slug}.json`);
  if (!existsSync(path)) return undefined;
  const data = JSON.parse(readFileSync(path, "utf8")) as {
    candidate?: { imageUrl?: string };
  };
  return data.candidate?.imageUrl;
}

async function ensureLocalPortrait(slug: string): Promise<boolean> {
  const publicPath = researchedPortraitPath(slug);
  const abs = absFromPublicPath(publicPath);
  if (existsSync(abs) && statSync(abs).size >= MIN_BYTES) return true;

  const spotifyId = VERIFIED_SPOTIFY_ARTIST_IDS[slug];
  if (spotifyId) {
    const spotifyUrl = await fetchSpotifyPortrait(spotifyId);
    if (spotifyUrl && (await downloadImage(slug, spotifyUrl))) return true;
  }

  const researchUrl = researchImageUrl(slug);
  if (researchUrl && (await downloadImage(slug, researchUrl))) return true;

  const registry = PORTRAIT_BY_SLUG.get(slug);
  if (registry?.imageSource.startsWith("http")) {
    const og = await fetchOpenGraphImage(registry.imageSource);
    if (og && (await downloadImage(slug, og))) return true;
  }

  return existsSync(abs) && statSync(abs).size >= MIN_BYTES;
}

function mapIngestedSource(sourceType: string): IngestedPortraitSource {
  if (sourceType === "spotify") return "spotify";
  if (sourceType === "resident-advisor") return "resident-advisor";
  return "official-website";
}

async function main() {
  const seeds = getArtistSeeds();
  const bySlug = new Map(seeds.map((s) => [s.slug, s]));
  let updated = 0;
  let downloaded = 0;
  const failures: string[] = [];

  for (const record of RESEARCHED_VERIFIED_PORTRAITS) {
    const seed = bySlug.get(record.slug);
    if (!seed) {
      failures.push(`${record.slug}: not in artist seeds`);
      continue;
    }

    const hadFile =
      existsSync(absFromPublicPath(record.imageUrl)) &&
      statSync(absFromPublicPath(record.imageUrl)).size >= MIN_BYTES;
    const ok = await ensureLocalPortrait(record.slug);
    if (!hadFile && ok) downloaded++;

    if (!ok) {
      failures.push(`${record.slug}: portrait file missing or too small`);
      continue;
    }

    const metadata = loadOrCreateMetadata(seed);
    const now = new Date().toISOString();
    const spotifyId = VERIFIED_SPOTIFY_ARTIST_IDS[record.slug];

    metadata.resolvedImage = {
      url: record.imageUrl,
      source: mapIngestedSource(record.sourceType),
      sourceUrl: record.imageSource,
    };
    metadata.updatedAt = now;

    if (spotifyId) {
      metadata.spotify = {
        artistId: spotifyId,
        name: record.artistName,
        url: `https://open.spotify.com/artist/${spotifyId}`,
        genres: metadata.spotify?.genres ?? [],
        followers: metadata.spotify?.followers ?? 0,
        popularity: metadata.spotify?.popularity ?? 0,
        imageUrl: record.imageUrl,
        imageUrls: [record.imageUrl],
        relatedArtists: metadata.spotify?.relatedArtists ?? [],
      };
      metadata.sources.spotify = { syncedAt: now, status: "ok" };
    }

    if (record.sourceType === "resident-advisor") {
      metadata.sources.residentAdvisor = { syncedAt: now, status: "ok" };
    }

    writeArtistMetadata(metadata);
    updated++;
    console.log(`✓ ${record.slug}`);
  }

  execSync("npx tsx scripts/build-metadata-bundle.ts", { stdio: "inherit" });

  console.log(`\nApplied ${updated}/${RESEARCHED_VERIFIED_PORTRAITS.length} portraits (${downloaded} downloaded)`);
  if (failures.length) {
    console.warn("Failures:\n", failures.map((f) => `  – ${f}`).join("\n"));
    process.exitCode = 1;
  }
}

main();
