import type { Genre } from "@/types";

/** Curated artist lists for Discover and editorial surfaces */
export const artistCollections = {
  "industrial-dark-techno": {
    title: "Industrial & Dark Techno Essentials",
    description:
      "The architects of dystopian dancefloors — from EBM roots to modern industrial techno.",
    slugs: [
      "chris-liebing",
      "paula-temple",
      "perc",
      "i-hate-models",
      "boy-harsher",
      "shlomo",
      "ancient-methods",
      "surgeon",
      "adam-x",
      "phase-fatale",
      "helena-hauff",
      "rebekah",
      "ghost-in-the-machine",
      "laven",
      "lucy",
      "kangding-ray",
      "obscure-shape",
      "rrose",
    ],
    genres: [
      "industrial-techno",
      "dark-techno",
      "industrial",
      "ebm",
      "industrial-ebm",
    ] satisfies Genre[],
  },
  "modern-hard-techno": {
    title: "Modern Hard Techno Leaders",
    description: "The current wave — festival headliners and warehouse destroyers defining hard techno now.",
    slugs: [
      "sara-landry",
      "klangkuenstler",
      "kobosil",
      "dyen",
      "trym",
      "charlie-sparks",
      "fantasm",
      "azyr",
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
      "alarico",
      "yazzus",
      "oguz",
      "regal",
      "vtss",
      "petduo",
    ],
    genres: ["hard-techno", "schranz", "acid-techno"] satisfies Genre[],
  },
  "peak-time-festival": {
    title: "Peak-Time / Festival Techno",
    description: "Main-stage energy and Berghain precision — built for the biggest rooms.",
    slugs: [
      "amelie-lens",
      "charlotte-de-witte",
      "alignment",
      "999999999",
      "anetha",
      "hadone",
      "victor-ruiz",
      "anfisa-letyago",
      "holy-priest",
      "funk-tribu",
      "parfait",
    ],
    genres: ["peak-time-techno", "hard-techno"] satisfies Genre[],
  },
} as const;

export type ArtistCollectionSlug = keyof typeof artistCollections;

export const collectionSlugs = Object.keys(artistCollections) as ArtistCollectionSlug[];

export function getCollectionGenres(slug: ArtistCollectionSlug): readonly Genre[] {
  return artistCollections[slug].genres ?? [];
}
