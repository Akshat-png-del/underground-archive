import type { Genre } from "@/types";
import { createCatalogArtist, type CatalogEntry } from "./builder";

interface BulkSeed {
  slug: string;
  name: string;
  country: string;
  city: string;
  activeSince: number;
  genres: Genre[];
  labels?: string[];
  similarArtists?: string[];
  trackTitles: string[];
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
    tracks: seed.trackTitles.slice(0, 5).map((title, i) => ({
      title,
      year: Math.min(seed.activeSince + i + 1, 2024),
      duration: "5:00",
    })),
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
    trackTitles: [`${name}`, "Warehouse Pressure", "Peak Hour", "Distorted Dreams", "Night Shift", "Raw Energy"],
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
    trackTitles: [`${name}`, "Factory Floor", "Steel Rhythm", "Dark Matter", "Machine Soul", "Void"],
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
    trackTitles: [`${name}`, "Cold Pulse", "Body Control", "Neon Decay", "Ashes", "Midnight Drive"],
    similarArtists: ["boy-harsher", "phase-fatale", "helene-hauff"],
    ...extra,
  };
}

const SEEDS: BulkSeed[] = [
  hard("azyr", "Azyr", "Brazil", "São Paulo", 2019, { trending: true, featured: true }),
  hard("mrd", "MRD", "France", "Paris", 2018, { labels: ["MRD"], trending: true }),
  hard("nico-moreno", "Nico Moreno", "France", "Lyon", 2017, {
    labels: ["No Mercy"],
    spotifyArtistId: "6fjhNhp9IoeiZpEXq9AT2S",
  }),
  hard("alarico", "Alarico", "Italy", "Milan", 2018, { trending: true }),
  hard("cravet", "CRAVET", "France", "Paris", 2019),
  hard("vntm", "VNTM", "Germany", "Berlin", 2018),
  hard("jks", "JKS", "France", "Paris", 2016, { labels: ["Molekul"] }),
  hard("rikhter", "Rikhter", "Germany", "Berlin", 2019),
  hard("somewhen", "Somewhen", "Germany", "Berlin", 2017),
  hard("stranger", "Stranger", "Belgium", "Antwerp", 2014, { labels: ["Stroboscopic Artefacts"] }),
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
  hard("anfisa-letyago", "Anfisa Letyago", "Russia", "Moscow", 2016, { featured: true }),
  hard("cltx", "CLTX", "France", "Paris", 2019),
  hard("krow", "Krow", "France", "Paris", 2018),
  hard("psyk32", "Psyk32", "France", "Paris", 2020),
  hard("tafkamp", "TAFKAMP", "Netherlands", "Amsterdam", 2017),
  hard("lars-huismann", "Lars Huismann", "Germany", "Berlin", 2015, { labels: ["Mord"] }),
  hard("pinion", "Pinion", "United Kingdom", "London", 2019),
  hard("kaiser", "Kaiser", "Germany", "Berlin", 2018),
  hard("blasha-allatt", "Blasha & Allatt", "United Kingdom", "Manchester", 2017, { labels: ["On Rotation"] }),
  hard("rosati", "Rosati", "Italy", "Naples", 2019),
  hard("novah", "Novah", "Germany", "Berlin", 2018),
  hard("jacidorex", "Jacidorex", "France", "Paris", 2019),
  hard("ha-cay", "Ha CAY", "France", "Paris", 2020),
  hard("blicz", "Blicz", "Poland", "Warsaw", 2019),
  hard("basswell", "Basswell", "France", "Paris", 2018),
  hard("matrakk", "Matrakk", "France", "Lyon", 2019),
  hard("yazzus", "Yazzus", "France", "Paris", 2018, { genres: ["hardgroove", "hard-techno", "peak-time-techno"], trending: true }),
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
  hard("oguz", "Oguz", "Turkey", "Istanbul", 2018, { trending: true }),
  hard("hausman", "Hausman", "France", "Paris", 2019),
  hard("vklf", "VKLF", "France", "Paris", 2020),
  hard("cleric", "Cleric", "Romania", "Bucharest", 2014, { labels: ["Clergy"] }),
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
  hard("eric-sneo", "Eric Sneo", "Germany", "Frankfurt", 1998, { genres: ["schranz", "hard-techno"], labels: ["CLR"], trackTitles: ["Sneo 1", "Sneo 2", "Metallic Loop", "Pressure", "Drive", "Endurance"] }),
  hard("petduo", "Petduo", "Germany", "Berlin", 2010, {
    genres: ["schranz", "hard-techno"],
    spotifyArtistId: "5SEUYqumyvmrkgWpOco1lo",
  }),
  hard("spd", "SPD", "Germany", "Berlin", 2015, { genres: ["schranz", "hard-techno"] }),
  hard("frank-nitzinsky", "Frank Nitzinsky", "Germany", "Berlin", 2005, { genres: ["schranz", "hard-techno"] }),
  hard("crystal-distortion", "Crystal Distortion", "France", "Paris", 2012, { genres: ["hard-techno", "acid-techno"] }),
  hard("hardfloor", "Hardfloor", "Germany", "Frankfurt", 1992, { genres: ["acid-techno", "hard-techno"], labels: ["Harthouse"], trackTitles: ["Acperience 1", "Acperience 2", "Hardtrance Acperience", "Fish & Chips", "Mirror Man", "Into Nature"] }),
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
  industrial("obscure-shape", "Obscure Shape", "Germany", "Berlin", 2014, { genres: ["dark-techno", "industrial-techno"], labels: ["Oliver Hafenbauer"] }),
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
  hard("kangding-ray", "Kangding Ray", "France", "Paris", 2006, { genres: ["hypnotic-techno", "dark-techno", "industrial-techno"], labels: ["RA"] }),
  hard("victor-ruiz", "Victor Ruiz", "Brazil", "São Paulo", 2010, {
    genres: ["peak-time-techno", "hard-techno"],
    featured: true,
    spotifyArtistId: "0xgdNNa5mIbnJKp8AG8S4z",
  }),
  hard("debora-alessio", "Debora Alessio", "Italy", "Milan", 2019, { genres: ["peak-time-techno", "hard-techno"] }),
  hard("francois-x", "François X", "France", "Paris", 2014, { genres: ["dark-techno", "peak-time-techno"], labels: ["Dement3d"] }),
];

export const bulkCatalogArtists = SEEDS.map((seed, i) => createCatalogArtist(toEntry(i + 32, seed)));
