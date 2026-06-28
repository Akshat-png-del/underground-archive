import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readTierPromotions, type TierPromotions } from "./tier-promotions";

const PROMOTIONS_PATH = join(process.cwd(), "src/content/artists/curation/tier-promotions.json");

/** Read promotions from disk — use in server routes so runtime writes are visible. */
export function readTierPromotionsFromDisk(): TierPromotions {
  if (!existsSync(PROMOTIONS_PATH)) return readTierPromotions();
  try {
    const raw = JSON.parse(readFileSync(PROMOTIONS_PATH, "utf8")) as TierPromotions;
    return {
      promotedToTier1: Array.isArray(raw.promotedToTier1) ? raw.promotedToTier1 : [],
    };
  } catch {
    return readTierPromotions();
  }
}

export function promoteToTier1(slug: string): TierPromotions {
  const current = readTierPromotionsFromDisk();
  const promotedToTier1 = [...new Set([...current.promotedToTier1, slug])];
  const next = { promotedToTier1 };
  mkdirSync(join(process.cwd(), "src/content/artists/curation"), { recursive: true });
  writeFileSync(PROMOTIONS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function getPromotedTier1SlugsFromDisk(): string[] {
  return readTierPromotionsFromDisk().promotedToTier1;
}
