/** Editorial curation tier — drives verification depth, not content removal. */
export type CurationTier = 1 | 2 | 3;

import { isPromotedToTier1, readTierPromotions } from "./tier-promotions";

/** Core archive — fully curated profiles. */
const TIER_1_SLUGS = [
  // Flagship profiles (data.ts)
  "sara-landry",
  "i-hate-models",
  "kobosil",
  "vtss",
  "regal",
  "boy-harsher",
  "amelie-lens",
  "charlotte-de-witte",
  "hadone",
  "anetha",
  // Priority catalog (31 → take 30)
  "chris-liebing",
  "paula-temple",
  "helena-hauff",
  "perc",
  "ancient-methods",
  "surgeon",
  "adam-x",
  "phase-fatale",
  "dyen",
  "trym",
  "charlie-sparks",
  "holy-priest",
  "fantasm",
  "alignment",
  "vendex",
  "klangkuenstler",
  "rebekah",
  "dj-rush",
  "orphx",
  "codex-empire",
  "ghost-in-the-machine",
  "laven",
  "sven-wittekind",
  "robert-natus",
  "arkus-p",
  "boris-s",
  "funk-tribu",
  "parfait",
  "nikolina",
  "999999999",
] as const;

/** Extended archive — image, bio, genres, and set coverage target. */
const TIER_2_SLUGS = [
  "shlomo",
  // Expansion catalog
  "josh-wink",
  "ansome",
  "paranoid-london",
  "dj-pierre",
  "randomer",
  // Featured / scene-defining bulk
  "azyr",
  "alarico",
  "anfisa-letyago",
  "yazzus",
  "oguz",
  "victor-ruiz",
  "nico-moreno",
  "basswell",
  "carv",
  "novah",
  "winson",
  "onlynumbers",
  "cloudy",
  "adrian-mills",
  "kozlov",
  "cera-khin",
  "lee-ann-roberts",
  "clara-cuve",
  "patrick-mason",
  "luca-agnelli",
  "lucy",
  "kangding-ray",
  "stranger",
  "cleric",
  "petduo",
  "blawan",
  "rrose",
  "obscure-shape",
  "vntm",
  "jks",
  "rikhter",
  "somewhen",
  // Verified targeted new-artist ingest (Spotify tracks + official sets)
  "byorn",
  "kuko",
  "lessss",
  "luciid",
  "doruksen",
  "kander",
  "callush",
  "krl-mx",
  "6ejou",
  "airod",
  "fatima-hajji",
  "fernanda-martins",
  "snts",
  "tommy-four-seven",
  "headless-horseman",
  "inhalt-der-nacht",
  "scalameriya",
  "dj-hyperdrive",
  "mischluft",
  "xrtn",
  "kas-st",
] as const;

const TIER_1 = new Set<string>(TIER_1_SLUGS);
const TIER_2 = new Set<string>(TIER_2_SLUGS);

export function getCurationTier(slug: string): CurationTier {
  if (TIER_1.has(slug) || isPromotedToTier1(slug)) return 1;
  if (TIER_2.has(slug)) return 2;
  return 3;
}

export function getPromotedTier1Slugs(): string[] {
  return readTierPromotions().promotedToTier1;
}

export function tierLabel(tier: CurationTier): string {
  switch (tier) {
    case 1:
      return "Tier 1 — fully curated";
    case 2:
      return "Tier 2 — extended";
    case 3:
      return "Tier 3 — directory";
  }
}

export const CURATION_TIER_COUNTS = {
  tier1: TIER_1.size,
  tier2: TIER_2.size,
} as const;

export { TIER_1_SLUGS, TIER_2_SLUGS };
