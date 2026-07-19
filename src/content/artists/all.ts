import { applyVerificationPipeline } from "@/lib/archive/pipeline";
import { applyIngestedMetadata } from "@/lib/ingestion/apply";
import { applyCatalogExpansion } from "@/lib/catalog/apply-expansion";
import { applyAuthenticityCleanup } from "@/lib/catalog/apply-authenticity";
import { ytThumb } from "@/lib/images";
import { coreArtists } from "./data";
import { catalogArtists } from "./catalog";
import { bulkCatalogArtists } from "./catalog-bulk";
import { expansionCatalogArtists } from "./catalog-expansion";
import { horBerlinCatalogArtists } from "./hor-berlin-seeds";
import { targetArtistCatalogArtists } from "./target-artists-seeds";

const rawArtists = [
  ...coreArtists,
  ...catalogArtists,
  ...bulkCatalogArtists,
  ...expansionCatalogArtists,
  ...horBerlinCatalogArtists,
  ...targetArtistCatalogArtists,
];

/** Official YouTube heroes that must survive curation (curation otherwise resets hero → portrait). */
const YOUTUBE_HERO_OVERRIDES: Record<string, string> = {
  // Sara Landry — EXIT 2025 Dance Arena (official channel)
  "sara-landry": ytThumb("dy90EQcQ-BY", "max"),
};

/** Local researched portraits that must beat ingested Spotify identity photos. */
const RESEARCHED_PORTRAIT_OVERRIDES: Record<string, string> = {
  "sara-landry": "/images/portraits/researched/sara-landry.jpg",
};

export const artists = applyAuthenticityCleanup(
  rawArtists
    .map(applyIngestedMetadata)
    .map(applyCatalogExpansion)
    .map(applyVerificationPipeline),
).map((artist) => {
  const hero = YOUTUBE_HERO_OVERRIDES[artist.slug];
  const portrait = RESEARCHED_PORTRAIT_OVERRIDES[artist.slug];
  if (!hero && !portrait) return artist;

  return {
    ...artist,
    ...(hero ? { heroImage: hero } : {}),
    ...(portrait
      ? {
          portrait,
          image: {
            url: portrait,
            source: "festival-press" as const,
            sourceType: "festival-press" as const,
            verified: true,
            imageSource: "https://www.youtube.com/watch?v=dy90EQcQ-BY",
            attribution: "EXIT Festival — Sara Landry EXIT 2025 Dance Arena",
            lastVerifiedAt: "2026-07-20",
          },
        }
      : {}),
  };
});
