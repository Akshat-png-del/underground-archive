/**
 * Artists currently excluded from bulk/expansion seeds after media-first cleanup.
 *
 * Many entries are legitimate artists missing verified playable media at cleanup time.
 * Reintroduce only via Curation Mode: verified Spotify track ID/URL and/or
 * YouTube set with API-verified duration ≥ 10 minutes.
 *
 * See: .cursor/rules/catalog-curation-mode.mdc
 * Final public gate: applyAuthenticityCleanup in all.ts
 */
export const AUTHENTICITY_REMOVED_SLUG_LIST = [
  "alex-bau",
  "amelior",
  "ash-code",
  "assemblage-23",
  "ben-spencer",
  "berkan",
  "berlyn",
  "bianca-obyn",

  "blicz",

  "cravet",
  "crystal-distortion",

  "daxson",
  "debora-alessio",
  "deepbass",
  "drab-majesty",
  "eric-sneo",

  "frank-nitzinsky",
  "front-242",
  "front-line-assembly",
  "ha-cay",
  "hante",
  "hardfloor",
  "hausman",

  "hemka",
  "hiccup",
  "ignacio",
  "igor-r",
  "iochan",
  "jacidorex",

  "klaps",
  "klonne",
  "krow",
  "lars-huismann",
  "leather-strip",
  "lebanon-hanover",
  "len-d",

  "linea-aspera",



  "mrd",
  "nitzer-ebb",

  "ogian",
  "ogive",

  "per-sona",
  "petra-flurr",
  "ph87",
  "phuture-corp",
  "pinion",
  "psyk32",

  "randall",
  "raw-distort",
  "raxyor",

  "rumina",
  "she-past-away",
  "spd",
  "spektre",

  "temo",
  "the-soft-moon",
  "vil",
  "vilchezz",
  "vklf",
  "vrtx",
  "warface",
  "weichentechnikk",

] as const;

export const AUTHENTICITY_REMOVED_SLUGS: ReadonlySet<string> = new Set(
  AUTHENTICITY_REMOVED_SLUG_LIST,
);
