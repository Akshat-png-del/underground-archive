import { execSync } from "node:child_process";
import type { ArtistIngestedMetadata, ArtistSeed, IngestionProvider } from "./types";
import {
  loadOrCreateMetadata,
  readArtistMetadata,
  updateManifestCount,
  writeArtistMetadata,
} from "./store";
import { resolveIngestedImage } from "./resolve-image";
import { fetchSpotifyArtistById, isSpotifyConfigured, searchSpotifyArtist } from "./spotify";
import { fetchYoutubeChannel, isYoutubeConfigured } from "./youtube";
import { fetchMusicBrainzArtist, isMusicBrainzConfigured } from "./musicbrainz";
import { fetchDiscogsArtist, isDiscogsConfigured } from "./discogs";
import { sleep } from "./http";
import { getArtistSeeds, mapRelatedToSlugs } from "./seeds";

export interface SyncOptions {
  providers?: IngestionProvider[];
  delayMs?: number;
}

const ALL_PROVIDERS: IngestionProvider[] = ["spotify", "youtube", "musicbrainz", "discogs"];

function rebuildMetadataBundle(): void {
  try {
    execSync("npx tsx scripts/build-metadata-bundle.ts", {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  } catch {
    console.warn("Could not rebuild metadata bundle — run: npm run sync:bundle");
  }
}

export async function syncArtistMetadata(
  seed: ArtistSeed,
  options: SyncOptions = {}
): Promise<ArtistIngestedMetadata> {
  const providers = options.providers ?? ALL_PROVIDERS;
  const delayMs = options.delayMs ?? 300;
  const metadata = loadOrCreateMetadata(seed);
  const now = new Date().toISOString();

  if (providers.includes("spotify") && isSpotifyConfigured()) {
    try {
      const spotify = seed.spotifyArtistId
        ? await fetchSpotifyArtistById(seed.spotifyArtistId)
        : await searchSpotifyArtist(seed.name);

      if (spotify) {
        metadata.spotify = spotify;
        metadata.name = spotify.name;
        metadata.relatedArtistSlugs = mapRelatedToSlugs(spotify.relatedArtists);
        metadata.sources.spotify = { syncedAt: now, status: "ok" };
      } else {
        metadata.sources.spotify = { syncedAt: now, status: "skipped", error: "No match" };
      }
    } catch (error) {
      metadata.sources.spotify = {
        syncedAt: now,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
    await sleep(delayMs);
  }

  if (providers.includes("youtube") && isYoutubeConfigured()) {
    try {
      metadata.youtube = await fetchYoutubeChannel(seed.name);
      metadata.sources.youtube = { syncedAt: now, status: "ok" };
    } catch (error) {
      metadata.sources.youtube = {
        syncedAt: now,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
    await sleep(delayMs);
  }

  if (providers.includes("musicbrainz") && isMusicBrainzConfigured()) {
    try {
      const mb = await fetchMusicBrainzArtist(seed.name);
      if (mb) {
        metadata.musicbrainz = mb;
        metadata.sources.musicbrainz = { syncedAt: now, status: "ok" };
      } else {
        metadata.sources.musicbrainz = { syncedAt: now, status: "skipped", error: "No match" };
      }
    } catch (error) {
      metadata.sources.musicbrainz = {
        syncedAt: now,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (providers.includes("discogs") && isDiscogsConfigured()) {
    try {
      const discogs = await fetchDiscogsArtist(seed.name);
      if (discogs) {
        metadata.discogs = discogs;
        metadata.sources.discogs = { syncedAt: now, status: "ok" };
      } else {
        metadata.sources.discogs = { syncedAt: now, status: "skipped", error: "No match" };
      }
    } catch (error) {
      metadata.sources.discogs = {
        syncedAt: now,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
    await sleep(delayMs);
  }

  metadata.resolvedImage = resolveIngestedImage(metadata);
  metadata.updatedAt = now;
  writeArtistMetadata(metadata);
  return metadata;
}

export async function syncAllArtists(options: SyncOptions = {}): Promise<void> {
  const seeds = getArtistSeeds();
  let ok = 0;
  let failed = 0;

  for (const seed of seeds) {
    try {
      await syncArtistMetadata(seed, options);
      ok++;
      console.log(`✓ ${seed.slug}`);
    } catch (error) {
      failed++;
      console.error(`✗ ${seed.slug}:`, error instanceof Error ? error.message : error);
    }
  }

  updateManifestCount();
  console.log(`\nSynced ${ok}/${seeds.length} artists (${failed} errors)`);
  rebuildMetadataBundle();
}

export async function syncSingleArtist(
  slug: string,
  options: SyncOptions = {}
): Promise<ArtistIngestedMetadata> {
  const seed = getArtistSeeds().find((s) => s.slug === slug);
  if (!seed) {
    throw new Error(`Unknown artist slug: ${slug}`);
  }
  const metadata = await syncArtistMetadata(seed, options);
  updateManifestCount();
  rebuildMetadataBundle();
  return metadata;
}

export function getSyncedArtistMetadata(slug: string) {
  return readArtistMetadata(slug);
}
