import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtistIngestedMetadata, IngestionManifest } from "./types";
import { ARTISTS_METADATA_DIR, INGESTION_DIR, MANIFEST_PATH } from "./config";

function metadataPath(slug: string): string {
  return join(process.cwd(), ARTISTS_METADATA_DIR, `${slug}.json`);
}

export function ensureIngestionDirs(): void {
  mkdirSync(join(process.cwd(), ARTISTS_METADATA_DIR), { recursive: true });
}

export function readManifest(): IngestionManifest {
  const path = join(process.cwd(), MANIFEST_PATH);
  if (!existsSync(path)) {
    return { version: 1, lastFullSync: null, artistCount: 0 };
  }
  return JSON.parse(readFileSync(path, "utf8")) as IngestionManifest;
}

export function writeManifest(manifest: IngestionManifest): void {
  ensureIngestionDirs();
  writeFileSync(join(process.cwd(), MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function readArtistMetadata(slug: string): ArtistIngestedMetadata | undefined {
  const path = metadataPath(slug);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ArtistIngestedMetadata;
  } catch {
    return undefined;
  }
}

export function writeArtistMetadata(metadata: ArtistIngestedMetadata): void {
  ensureIngestionDirs();
  writeFileSync(metadataPath(metadata.slug), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

export function loadOrCreateMetadata(seed: {
  slug: string;
  name: string;
}): ArtistIngestedMetadata {
  const existing = readArtistMetadata(seed.slug);
  if (existing) return existing;
  return {
    slug: seed.slug,
    name: seed.name,
    updatedAt: new Date().toISOString(),
    sources: {},
  };
}

export function readAllArtistMetadata(): ArtistIngestedMetadata[] {
  const dir = join(process.cwd(), ARTISTS_METADATA_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), "utf8")) as ArtistIngestedMetadata;
      } catch {
        return null;
      }
    })
    .filter((m): m is ArtistIngestedMetadata => !!m);
}

export function updateManifestCount(): void {
  const manifest = readManifest();
  manifest.artistCount = readAllArtistMetadata().length;
  writeManifest(manifest);
}
