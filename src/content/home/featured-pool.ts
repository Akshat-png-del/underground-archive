import { artists, getArtist } from "@/content/artists";
import type { Artist } from "@/types";

/** Globally recognized artists — verified catalog entries only. */
export const CURATED_FEATURED_SLUGS = [
  "sara-landry",
  "i-hate-models",
  "klangkuenstler",
  "fantasm",
  "holy-priest",
  "nikolina",
  "charlie-sparks",
  "trym",
  "alignment",
  "shlomo",
  "999999999",
  "vendex",
  "kobosil",
  "charlotte-de-witte",
  "amelie-lens",
  "vtss",
  "regal",
  "hadone",
  "parfait",
  "paula-temple",
  "boy-harsher",
  "anetha",
  "chris-liebing",
  "perc",
  "ancient-methods",
  "helena-hauff",
  "yazzus",
  "oguz",
  "alarico",
  "azyr",
  "nico-moreno",
  "basswell",
  "carv",
  "clara-cuve",
  "patrick-mason",
  "adrian-mills",
  "cera-khin",
  "cloudy",
  "luca-agnelli",
  "lee-ann-roberts",
  "kozlov",
  "onlynumbers",
  "winson",
  "novah",
  "victor-ruiz",
  "anfisa-letyago",
  "funk-tribu",
] as const;

const catalogSlugs = new Set(artists.map((a) => a.slug));

/** Featured pool resolved against live catalog — no removed or metadata-only artists. */
export function getCuratedFeaturedArtists(): Artist[] {
  return CURATED_FEATURED_SLUGS.map((slug) => getArtist(slug)).filter(
    (a): a is Artist => !!a && catalogSlugs.has(a.slug),
  );
}

/** Deterministic slice for SSR / first paint. */
export function pickFeaturedWindow(count: number, startIndex = 0): Artist[] {
  const pool = getCuratedFeaturedArtists();
  if (pool.length === 0) return artists.slice(0, count);
  const out: Artist[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    out.push(pool[(startIndex + i) % pool.length]);
  }
  return out;
}
