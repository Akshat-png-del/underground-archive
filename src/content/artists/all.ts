import { applyVerificationPipeline } from "@/lib/archive/pipeline";
import { applyIngestedMetadata } from "@/lib/ingestion/apply";
import { applyCatalogExpansion } from "@/lib/catalog/apply-expansion";
import { applyAuthenticityCleanup } from "@/lib/catalog/apply-authenticity";
import { coreArtists } from "./data";
import { catalogArtists } from "./catalog";
import { bulkCatalogArtists } from "./catalog-bulk";
import { expansionCatalogArtists } from "./catalog-expansion";
import { horBerlinCatalogArtists } from "./hor-berlin-seeds";

const rawArtists = [
  ...coreArtists,
  ...catalogArtists,
  ...bulkCatalogArtists,
  ...expansionCatalogArtists,
  ...horBerlinCatalogArtists,
];

export const artists = applyAuthenticityCleanup(
  rawArtists
    .map(applyIngestedMetadata)
    .map(applyCatalogExpansion)
    .map(applyVerificationPipeline),
);
