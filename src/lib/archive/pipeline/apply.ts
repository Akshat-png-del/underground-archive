import { applyCurationTier } from "@/lib/archive/curation";
import { getCurationTier } from "@/lib/archive/curation/tiers";
import type { Artist } from "@/types";

/** Apply editorial curation tier rules — never removes catalog content globally. */
export function applyVerificationPipeline(artist: Artist): Artist {
  const tier = getCurationTier(artist.slug);
  return applyCurationTier(artist, tier);
}

export { applyCurationTier, enrichBase, tierToStatus } from "@/lib/archive/curation";
