import rawPromotions from "@/content/artists/curation/tier-promotions.json";

export interface TierPromotions {
  promotedToTier1: string[];
}

const DEFAULT: TierPromotions = { promotedToTier1: [] };

export function readTierPromotions(): TierPromotions {
  try {
    const raw = rawPromotions as TierPromotions;
    return {
      promotedToTier1: Array.isArray(raw.promotedToTier1) ? raw.promotedToTier1 : [],
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function isPromotedToTier1(slug: string): boolean {
  return readTierPromotions().promotedToTier1.includes(slug);
}
