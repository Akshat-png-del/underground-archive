import type { ArtistIngestedMetadata } from "@/lib/ingestion/types";
import ingestedBundle from "./ingested.json";

const bundle = ingestedBundle as Record<string, ArtistIngestedMetadata>;

export function getIngestedMetadata(slug: string): ArtistIngestedMetadata | undefined {
  return bundle[slug];
}

export function getAllIngestedMetadata(): ArtistIngestedMetadata[] {
  return Object.values(bundle);
}

export function hasIngestedMetadata(slug: string): boolean {
  return slug in bundle;
}

/** No-op — bundle is static; run sync scripts to refresh ingested.json */
export function clearIngestedMetadataCache(): void {}
