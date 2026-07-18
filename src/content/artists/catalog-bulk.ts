import type { Genre } from "@/types";
import { createCatalogArtist, type CatalogEntry } from "./builder";
import { AUTHENTICITY_REMOVED_SLUGS } from "./authenticity-removals";

interface BulkSeed {
  slug: string;
  name: string;
  country: string;
  city: string;
  activeSince: number;
  genres: Genre[];
  labels?: string[];
  similarArtists?: string[];
  spotifyArtistId?: string;
  trending?: boolean;
  featured?: boolean;
}

function toEntry(_idx: number, seed: BulkSeed): CatalogEntry {
  return {
    slug: seed.slug,
    name: seed.name,
    country: seed.country,
    city: seed.city,
    scene: seed.city,
    activeSince: seed.activeSince,
    genres: seed.genres,
    verificationStatus: seed.spotifyArtistId ? "partial" : "unverified",
    spotifyArtistId: seed.spotifyArtistId,
    labels: seed.labels ?? [],
    bpmRange: seed.genres.includes("darkwave") || seed.genres.includes("post-punk")
      ? ([120, 140] as [number, number])
      : ([140, 155] as [number, number]),
    similarArtists: seed.similarArtists ?? [],
    // Never seed placeholder track titles — real tracks come from expansions / research.
    tracks: [],
    trending: seed.trending,
    featured: seed.featured,
  };
}

function hard(slug: string, name: string, country: string, city: string, since: number, extra?: Partial<BulkSeed>): BulkSeed {
  return {
    slug,
    name,
    country,
    city,
    activeSince: since,
    genres: ["hard-techno", "peak-time-techno"],
    similarArtists: ["kobosil", "dyen", "trym", "fantasm", "charlie-sparks", "klangkuenstler"],
    ...extra,
  };
}

function industrial(slug: string, name: string, country: string, city: string, since: number, extra?: Partial<BulkSeed>): BulkSeed {
  return {
    slug,
    name,
    country,
    city,
    activeSince: since,
    genres: ["industrial-techno", "dark-techno"],
    similarArtists: ["paula-temple", "i-hate-models", "shlomo", "ancient-methods", "perc"],
    ...extra,
  };
}

function ebmDark(slug: string, name: string, country: string, city: string, since: number, genres: Genre[], extra?: Partial<BulkSeed>): BulkSeed {
  return {
    slug,
    name,
    country,
    city,
    activeSince: since,
    genres,
    similarArtists: ["boy-harsher", "phase-fatale", "helene-hauff"],
    ...extra,
  };
}

const SEEDS: BulkSeed[] = [
  hard("azyr", "Azyr", "Brazil", "São Paulo", 2019, {
    trending: true,
    featured: true,
    spotifyArtistId: "1Ujj9Jh1Z4tDJ4j6qGRml8",
    similarArtists: ["nico-moreno", "basswell", "carv", "fantasm", "trym", "winson"],
  }),
  hard("nico-moreno", "Nico Moreno", "France", "Lyon", 2017, {
    labels: ["No Mercy"],
    trending: true,
    featured: true,
    spotifyArtistId: "6fjhNhp9IoeiZpEXq9AT2S",
    similarArtists: ["azyr", "basswell", "carv", "fantasm", "trym", "novah"],
  }),
  hard("basswell", "Basswell", "France", "Paris", 2018, {
    trending: true,
    featured: true,
    spotifyArtistId: "4NzdIkiweEHJgVdg8q2Ruk",
    similarArtists: ["azyr", "nico-moreno", "carv", "winson", "onlynumbers", "novah"],
  }),
  hard("carv", "CARV", "Netherlands", "Amsterdam", 2019, {
    trending: true,
    featured: true,
    spotifyArtistId: "6xenmpQHeDugzwDn9H2pSI",
    similarArtists: ["basswell", "onlynumbers", "winson", "cloudy", "azyr", "nico-moreno"],
  }),
  hard("clara-cuve", "Clara Cuvé", "Spain", "Madrid", 2019, {
    trending: true,
    featured: true,
    spotifyArtistId: "7daFW9cX9jHmOxZ0PIofRm",
    similarArtists: ["lee-ann-roberts", "cera-khin", "patrick-mason", "vtss", "anetha", "yazzus"],
  }),
  hard("patrick-mason", "Patrick Mason", "Ireland", "Dublin", 2018, {
    trending: true,
    featured: true,
    spotifyArtistId: "32H97VEM4nTqJsJgdt3hDg",
    similarArtists: ["amelie-lens", "clara-cuve", "lee-ann-roberts", "anetha", "alignment", "999999999"],
  }),
  hard("adrian-mills", "Adrián Mills", "Spain", "Madrid", 2019, {
    trending: true,
    featured: true,
    spotifyArtistId: "6H9sRmDCsXzsWK7jEg1thF",
    similarArtists: ["cloudy", "winson", "carv", "onlynumbers", "basswell", "azyr"],
  }),
  hard("cera-khin", "Cera Khin", "Germany", "Berlin", 2018, {
    trending: true,
    featured: true,
    spotifyArtistId: "49QMv0RvuxcUG8Xk6YweEz",
    similarArtists: ["lee-ann-roberts", "clara-cuve", "vtss", "yazzus", "fantasm", "trym"],
  }),
  hard("cloudy", "Cloudy", "Netherlands", "Amsterdam", 2020, {
    trending: true,
    featured: true,
    spotifyArtistId: "6T9GuyLe3Wkw5KRhhXUMC1",
    similarArtists: ["adrian-mills", "winson", "carv", "onlynumbers", "basswell", "novah"],
  }),
  hard("luca-agnelli", "Luca Agnelli", "Italy", "Florence", 2015, {
    trending: true,
    featured: true,
    spotifyArtistId: "4gF60Mys5KoWdQrf0bhRWq",
    similarArtists: ["i-hate-models", "kobosil", "999999999", "alignment", "anetha", "hadone"],
  }),
  hard("lee-ann-roberts", "Lee Ann Roberts", "United States", "Detroit", 2018, {
    trending: true,
    featured: true,
    spotifyArtistId: "0vemAVjLY9Dbz229ZqRlT1",
    similarArtists: ["cera-khin", "clara-cuve", "vtss", "yazzus", "anetha", "fantasm"],
  }),
  hard("kozlov", "Køzløv", "France", "Paris", 2018, {
    trending: true,
    featured: true,
    spotifyArtistId: "6lmg9kOOeuhhgThuBOE4bX",
    similarArtists: ["basswell", "nico-moreno", "azyr", "carv", "novah", "winson"],
  }),
  hard("onlynumbers", "Onlynumbers", "Netherlands", "Amsterdam", 2019, {
    trending: true,
    featured: true,
    spotifyArtistId: "14lZi2xEonJg9DyYk9JBak",
    similarArtists: ["carv", "winson", "basswell", "cloudy", "adrian-mills", "novah"],
  }),
  hard("winson", "Winson", "Netherlands", "Amsterdam", 2019, {
    trending: true,
    featured: true,
    spotifyArtistId: "2z9op9COiMU6QquVfY8HTN",
    similarArtists: ["onlynumbers", "carv", "basswell", "cloudy", "azyr", "nico-moreno"],
  }),
  hard("novah", "NOVAH", "Germany", "Berlin", 2018, {
    trending: true,
    featured: true,
    spotifyArtistId: "7qvjUtp2ccRD9AiDnukyFF",
    similarArtists: ["nico-moreno", "basswell", "azyr", "fantasm", "trym", "winson"],
  }),
  hard("alarico", "Alarico", "Italy", "Milan", 2018, { spotifyArtistId: "3160Uht6QdGT17EECSPWAO",  trending: true }),
  hard("cravet", "CRAVET", "France", "Paris", 2019),
  hard("vntm", "VNTM", "Germany", "Berlin", 2018, { spotifyArtistId: "3OIINbAKKK2MjCiFEpEft3" }),
  hard("jks", "JKS", "France", "Paris", 2016, { spotifyArtistId: "7CQ5jMPSOl75LWm04fshav", labels: ["Molekul"] }),
  hard("rikhter", "Rikhter", "Germany", "Berlin", 2019, { spotifyArtistId: "01wXJJ2iH73waMzLrINVY6" }),
  hard("somewhen", "Somewhen", "Germany", "Berlin", 2017, { spotifyArtistId: "0k47nZgznsmnNkSIJvjbVy" }),
  hard("stranger", "Stranger", "Belgium", "Antwerp", 2014, { spotifyArtistId: "3DPK0SXbCc0YYwFrsHUSWP",  labels: ["Stroboscopic Artefacts"] }),
  hard("spektre", "Spektre", "United Kingdom", "London", 2015),
  hard("ben-spencer", "Ben Spencer", "United Kingdom", "Manchester", 2018),
  hard("ogian", "Ogian", "Italy", "Rome", 2019),
  hard("moia", "Moia", "France", "Paris", 2020),
  hard("daxson", "Daxson", "United Kingdom", "London", 2018, { trending: true }),
  hard("yant", "Yant", "United Kingdom", "London", 2016),
  hard("ignacio", "Ignacio", "Spain", "Barcelona", 2019),
  hard("chlar", "Chlar", "Germany", "Berlin", 2018, { genres: ["hardgroove", "hard-techno", "peak-time-techno"] }),
  hard("klaps", "Klaps (BE)", "Belgium", "Brussels", 2019),
  hard("lsdxoxo", "LSDXOXO", "United States", "Philadelphia", 2018),
  hard("ogive", "Ogive", "France", "Paris", 2017),
  hard("anfisa-letyago", "Anfisa Letyago", "Russia", "Moscow", 2016, { spotifyArtistId: "7icoOm5fKKPo49jVxoj1Cq",  featured: true }),
  hard("cltx", "CLTX", "France", "Paris", 2019),
  hard("krow", "Krow", "France", "Paris", 2018),
  hard("psyk32", "Psyk32", "France", "Paris", 2020),
  hard("tafkamp", "TAFKAMP", "Netherlands", "Amsterdam", 2017),
  hard("lars-huismann", "Lars Huismann", "Germany", "Berlin", 2015, { labels: ["Mord"] }),
  hard("pinion", "Pinion", "United Kingdom", "London", 2019),
  hard("kaiser", "Kaiser", "Germany", "Berlin", 2018),
  hard("blasha-allatt", "Blasha & Allatt", "United Kingdom", "Manchester", 2017, { labels: ["On Rotation"] }),
  hard("rosati", "Rosati", "Italy", "Naples", 2019),
  hard("jacidorex", "Jacidorex", "France", "Paris", 2019),
  hard("ha-cay", "Ha CAY", "France", "Paris", 2020),
  hard("blicz", "Blicz", "Poland", "Warsaw", 2019),
  hard("matrakk", "Matrakk", "France", "Lyon", 2019),
  hard("yazzus", "Yazzus", "France", "Paris", 2018, { spotifyArtistId: "0KWutsZ75Y4GvjcPTFnKXU",  genres: ["hardgroove", "hard-techno", "peak-time-techno"], trending: true }),
  hard("yanamaste", "Yanamaste", "France", "Paris", 2019),
  hard("warface", "Warface", "Netherlands", "Amsterdam", 2017),
  hard("mcmlxxxv", "MCMLXXXV", "France", "Paris", 2018),
  hard("temo", "Temo", "Germany", "Berlin", 2019),
  hard("raxyor", "Raxyor", "France", "Paris", 2018),
  hard("vil", "VIL", "France", "Paris", 2019),
  hard("vilchezz", "VILCHEZZ", "Spain", "Barcelona", 2020),
  hard("hemka", "Hemka", "France", "Paris", 2018),
  hard("iochan", "Iochan", "Japan", "Tokyo", 2019),
  hard("randall", "Randall", "France", "Paris", 2017),
  hard("oguz", "Oguz", "Turkey", "Istanbul", 2018, { spotifyArtistId: "2n6aFLFLpEBs61Kfy5EX5v",  trending: true }),
  hard("hausman", "Hausman", "France", "Paris", 2019),
  hard("vklf", "VKLF", "France", "Paris", 2020),
  hard("cleric", "Cleric", "Romania", "Bucharest", 2014, { spotifyArtistId: "4KT7MVScl2ZwwX6uDUJIEL",  labels: ["Clergy"] }),
  hard("pulsar", "Pulsar", "France", "Paris", 2019),
  hard("amelior", "Amelior", "France", "Paris", 2018),
  hard("vrtx", "VRTX", "France", "Paris", 2020),
  hard("klonne", "Klonne", "Germany", "Berlin", 2019),
  hard("hiccup", "Hiccup", "United Kingdom", "London", 2018),
  hard("igor-r", "Igor R", "France", "Paris", 2019),
  hard("raw-distort", "Raw Distort", "Germany", "Berlin", 2018),
  hard("berkan", "Berkan", "Turkey", "Istanbul", 2019),
  hard("berlyn", "Berlyn", "Germany", "Berlin", 2020),
  hard("bianca-obyn", "Bianca Oblivion", "United Kingdom", "London", 2018),
  hard("eric-sneo", "Eric Sneo", "Germany", "Frankfurt", 1998, { genres: ["schranz", "hard-techno"], labels: ["CLR"] }),
  hard("petduo", "Petduo", "Germany", "Berlin", 2010, {
    genres: ["schranz", "hard-techno"],
    spotifyArtistId: "5SEUYqumyvmrkgWpOco1lo",
  }),
  hard("spd", "SPD", "Germany", "Berlin", 2015, { genres: ["schranz", "hard-techno"] }),
  hard("frank-nitzinsky", "Frank Nitzinsky", "Germany", "Berlin", 2005, { genres: ["schranz", "hard-techno"] }),
  hard("crystal-distortion", "Crystal Distortion", "France", "Paris", 2012, { genres: ["hard-techno", "acid-techno"] }),
  hard("hardfloor", "Hardfloor", "Germany", "Frankfurt", 1992, { genres: ["acid-techno", "hard-techno"], labels: ["Harthouse"] }),
  industrial("front-line-assembly", "Front Line Assembly", "Canada", "Vancouver", 1986, { genres: ["industrial", "ebm", "industrial-ebm"], labels: ["Metropolis"] }),
  industrial("nitzer-ebb", "Nitzer Ebb", "United Kingdom", "Essex", 1982, { genres: ["ebm", "industrial-ebm"], labels: ["Mute"] }),
  industrial("leather-strip", "Leather Strip", "Sweden", "Gothenburg", 1989, { genres: ["ebm", "industrial-ebm"] }),
  industrial("assemblage-23", "Assemblage 23", "United States", "Seattle", 1998, {
    genres: ["ebm", "darkwave"],
    spotifyArtistId: "7pwThElmrxl0pjTwXMojCx",
  }),
  industrial("hante", "Hante", "France", "Paris", 2013, {
    genres: ["darkwave", "post-punk"],
    spotifyArtistId: "5PhSiNjHZevtfAj9zmvVkU",
  }),
  ebmDark("she-past-away", "She Past Away", "Turkey", "Istanbul", 2006, ["darkwave", "post-punk"], {
    featured: true,
    spotifyArtistId: "6paE8ghTau4qwwNzVRSgjR",
  }),
  ebmDark("lebanon-hanover", "Lebanon Hanover", "Germany", "Berlin", 2010, ["darkwave", "post-punk"], {
    trending: true,
    spotifyArtistId: "6w8h2uD28BEdg7bX4k3Lh7",
  }),
  ebmDark("drab-majesty", "Drab Majesty", "United States", "Los Angeles", 2012, ["darkwave", "post-punk"], {
    spotifyArtistId: "2CSEKlTT9empsZ8vZWsrKO",
  }),
  ebmDark("linea-aspera", "Linea Aspera", "United Kingdom", "London", 2011, ["darkwave", "ebm"]),
  ebmDark("ash-code", "Ash Code", "Italy", "Naples", 2014, ["darkwave", "post-punk"]),
  ebmDark("rumina", "Rumina", "Germany", "Berlin", 2015, ["darkwave", "ebm"], {
    spotifyArtistId: "7IDiYtKojSbRAaf2b2Mpew",
  }),
  ebmDark("per-sona", "Per-sona", "Italy", "Milan", 2016, ["darkwave", "post-punk"]),
  ebmDark("the-soft-moon", "The Soft Moon", "United States", "San Francisco", 2009, ["darkwave", "post-punk"], {
    featured: true,
    spotifyArtistId: "40HeNm05FEAxGx8gUOV4my",
  }),
  industrial("phuture-corp", "Phuture Corp", "Germany", "Berlin", 2016, { genres: ["dark-techno", "industrial-techno"] }),
  industrial("obscure-shape", "Obscure Shape", "Germany", "Berlin", 2014, {
    genres: ["dark-techno", "industrial-techno"],
    labels: ["Oliver Hafenbauer"],
    spotifyArtistId: "6RLKERK1S5PKg3dLhzM0ZB",
  }),
  industrial("rrose", "Rrose", "United States", "Philadelphia", 2009, {
    genres: ["dark-techno", "industrial-techno"],
    spotifyArtistId: "5naKaYAyzzuPDsh4H2dwyT",
  }),
  industrial("blawan", "Blawan", "United Kingdom", "London", 2009, {
    genres: ["dark-techno", "industrial-techno"],
    spotifyArtistId: "64kN9EkSTHYhda2FupL0KI",
  }),
  hard("clouds", "Clouds", "United Kingdom", "Edinburgh", 2012, { genres: ["hard-techno", "industrial-techno"] }),
  hard("ph87", "PH87", "France", "Paris", 2019, { spotifyArtistId: "6w8j7obDDze1ovIL3lXGZf" }),
  hard("part-time-killer", "Part Time Killer", "France", "Paris", 2020, {
    spotifyArtistId: "1PDjdSn9YCXz1reA1PUcC0",
  }),
  hard("lucy", "Lucy", "Germany", "Berlin", 2009, {
    genres: ["hypnotic-techno", "dark-techno", "industrial-techno"],
    labels: ["Stroboscopic Artefacts"],
    spotifyArtistId: "0BlPI3UKzTcN2jf0gCa0b9",
  }),
  hard("kangding-ray", "Kangding Ray", "France", "Paris", 2006, { spotifyArtistId: "20UWNE4rEU7YMO0GHq4F26",  genres: ["hypnotic-techno", "dark-techno", "industrial-techno"], labels: ["RA"] }),
  hard("victor-ruiz", "Victor Ruiz", "Brazil", "São Paulo", 2010, {
    genres: ["peak-time-techno", "hard-techno"],
    featured: true,
    spotifyArtistId: "0xgdNNa5mIbnJKp8AG8S4z",
  }),
  hard("debora-alessio", "Debora Alessio", "Italy", "Milan", 2019, { genres: ["peak-time-techno", "hard-techno"] }),
  hard("francois-x", "François X", "France", "Paris", 2014, { genres: ["dark-techno", "peak-time-techno"], labels: ["Dement3d"] }),
];

export const bulkCatalogSeeds = SEEDS;

export const bulkCatalogArtists = SEEDS.filter(
  (seed) => !AUTHENTICITY_REMOVED_SLUGS.has(seed.slug),
).map((seed, i) => createCatalogArtist(toEntry(i + 32, seed)));
