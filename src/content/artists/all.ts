import { applyVerificationPipeline } from "@/lib/archive/pipeline";
import { applyIngestedMetadata } from "@/lib/ingestion/apply";
import { applyCatalogExpansion } from "@/lib/catalog/apply-expansion";
import { coreArtists } from "./data";
import { catalogArtists } from "./catalog";
import { bulkCatalogArtists } from "./catalog-bulk";
import { expansionCatalogArtists } from "./catalog-expansion";

const rawArtists = [
  ...coreArtists,
  ...catalogArtists,
  ...bulkCatalogArtists,
  ...expansionCatalogArtists,
];

export const artists = rawArtists
  .map(applyIngestedMetadata)
  .map(applyCatalogExpansion)
  .map(applyVerificationPipeline);
