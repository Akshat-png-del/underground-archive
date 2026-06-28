import type { ArtistResearchRecord } from "./types";

const FULL = 1;

const sp = (artistId: string) => ({
  artistId,
  url: `https://open.spotify.com/artist/${artistId}`,
  confidence: FULL,
});

const link = (url: string) => ({ url, confidence: FULL });

const tr = (title: string, spotifyTrackId: string, year: number, duration: string) => ({
  title,
  spotifyTrackId,
  year,
  duration,
  confidence: FULL,
});

const st = (title: string, venue: string, year: number, youtubeId: string) => ({
  title,
  venue,
  year,
  youtubeId,
  confidence: FULL,
});

/**
 * Editorial research registry — only fields with ≥95% confidence are listed.
 * Tracks require explicit Spotify track URLs in source research (never pooled IDs).
 */
export const ARTIST_RESEARCH_RECORDS: ArtistResearchRecord[] = [
  {
    slug: "sara-landry",
    name: "Sara Landry",
    country: "United States",
    genres: ["hard-techno", "industrial-techno"],
    verificationStatus: "verified",
    spotify: sp("7eILArMiTFTQf8SEh5fFHK"),
    instagram: link("https://www.instagram.com/saralandry/"),
    soundcloud: link("https://soundcloud.com/sara-landry"),
    youtube: link("https://www.youtube.com/@saralandry"),
    residentAdvisor: link("https://ra.co/dj/saralandry"),
    tracks: [
      tr("Legacy", "0aMonkh8OKgqx1K0viRHRT", 2023, "6:49"),
      tr("Pressure", "3LgA6sFAEZ30TqeTWmGDlV", 2024, "4:19"),
      tr("Prisoner", "2Rb5DcNmRKGmMGB48cY8cy", 2024, "5:08"),
      tr("Grief Into Rage", "0JmFNORLiAQwtz48DsqeD0", 2023, "6:12"),
      tr("Chaos Magicka", "5I5urH7JO7rRAUI4JCodLW", 2023, "4:52"),
    ],
    sets: [st("Boiler Room x Teletech Festival 2023", "Boiler Room", 2023, "EIQlDpgAY5Y")],
  },
  {
    slug: "i-hate-models",
    name: "I Hate Models",
    country: "France",
    genres: ["hard-techno", "industrial-techno", "ebm"],
    verificationStatus: "verified",
    spotify: sp("0KqSULB80ft2H3aFg6kJmN"),
    instagram: link("https://www.instagram.com/i_hate_models/"),
    soundcloud: link("https://soundcloud.com/i-hate-models"),
    youtube: link("https://www.youtube.com/@IHateModels"),
    residentAdvisor: link("https://ra.co/dj/ihatemodels"),
    tracks: [
      tr("Intergalactic Emotional Breakdown", "5dHDxDXEMaRjmf0wHZLBmy", 2019, "10:10"),
      tr("Two Steps From Heaven", "11VfNXFzTxL23ar2XUo695", 2021, "9:27"),
      tr("Spirals of Infinity", "7CzGQZkhxl7TLtZ4VL1uMc", 2019, "6:05"),
      tr("Shades Of Night", "4NAZVNM9sk0CH6zFw92TJN", 2016, "6:14"),
      tr("For My People", "0ZG5EiTjLZJRAEr05efBUS", 2024, "6:36"),
    ],
    sets: [st("Boiler Room x Teletech Festival 2024", "Boiler Room", 2024, "8CT6HxYA0cg")],
  },
  {
    slug: "kobosil",
    name: "Kobosil",
    country: "Germany",
    genres: ["hard-techno", "schranz", "industrial-techno"],
    verificationStatus: "verified",
    spotify: sp("2ZvIFwl0BuQgHqWvDE80hC"),
    instagram: link("https://www.instagram.com/kobosil/"),
    soundcloud: link("https://soundcloud.com/kobosil"),
    youtube: link("https://www.youtube.com/@kobosil"),
    residentAdvisor: link("https://ra.co/dj/kobosil"),
    tracks: [
      tr("Intimacy One", "2L6iML8RAAq2Csyd5mA6Ya", 2021, "5:55"),
      tr("Rigid", "7fXK4nSADxslMaAHshrkZI", 2022, "5:10"),
    ],
    sets: [
      st("Boiler Room Berlin", "Boiler Room", 2019, "E4lxtEzoQ3c"),
      st("Exhale Together Livestream", "Exhale", 2021, "pSkun1wICSc"),
    ],
  },
  {
    slug: "vtss",
    name: "VTSS",
    country: "Poland",
    genres: ["hard-techno", "industrial-techno"],
    verificationStatus: "verified",
    spotify: sp("0zo109NM3S7CqHpvlXwqEN"),
    instagram: link("https://www.instagram.com/vtss___/"),
    youtube: link("https://www.youtube.com/@VTSS"),
    residentAdvisor: link("https://ra.co/dj/vtss"),
    tracks: [
      tr("Goin Nuts", "5jt1fxz71bodmjOzvtqEV4", 2021, "4:30"),
      tr("Woah", "5kcWoHzVA1h6w8Uu4TgmzC", 2021, "5:03"),
      tr("Make You Scream", "5anpt5Mt1bT5c6wk6cwmu9", 2022, "5:20"),
      tr("C.E.T. Unlimited", "3eKCphLVlWBovVgh7veu2l", 2021, "6:19"),
    ],
    sets: [
      st("Boiler Room x Dekmantel Festival 2022", "Boiler Room", 2022, "Ko0hAh1iriE"),
      st("Boiler Room London", "Boiler Room", 2020, "D6sUo7Bw3Tc"),
    ],
  },
  {
    slug: "regal",
    name: "Regal",
    country: "Spain",
    genres: ["schranz", "hard-techno", "acid-techno"],
    verificationStatus: "verified",
    spotify: sp("10RlWd6mCUDiRpQ30bGL2E"),
    instagram: link("https://www.instagram.com/regal/"),
    residentAdvisor: link("https://ra.co/dj/regal"),
    sets: [st("Boiler Room Madrid: Mondo Disko XIX", "Boiler Room", 2019, "R6vYN8rRVqs")],
  },
  {
    slug: "boy-harsher",
    name: "Boy Harsher",
    country: "United States",
    genres: ["darkwave", "ebm", "industrial"],
    verificationStatus: "verified",
    spotify: sp("4iom7VVRU6AHRIu1JUXpLG"),
    instagram: link("https://www.instagram.com/boyharsher/"),
    youtube: link("https://www.youtube.com/@boyharsher"),
    residentAdvisor: link("https://ra.co/dj/boyharsher"),
    tracks: [
      tr("Pain", "13HYthybjhM3iyWcfl8VcN", 2018, "7:19"),
      tr("Fate", "2tpfPi4qSamU9EX5Q8FnNi", 2018, "5:00"),
    ],
    sets: [st("Boiler Room: Streaming From Isolation", "Boiler Room", 2020, "ZlIXogjQ8X0")],
  },
  {
    slug: "amelie-lens",
    name: "Amelie Lens",
    country: "Belgium",
    genres: ["hard-techno", "industrial-techno"],
    verificationStatus: "verified",
    spotify: sp("5Ho1vKl1Uz8bJlk4vbmvmf"),
    instagram: link("https://www.instagram.com/amelielens/"),
    youtube: link("https://www.youtube.com/@amelielens"),
    residentAdvisor: link("https://ra.co/dj/amelielens"),
    sets: [st("Exhale Together Livestream", "Exhale", 2021, "pSkun1wICSc")],
  },
  {
    slug: "charlotte-de-witte",
    name: "Charlotte de Witte",
    country: "Belgium",
    genres: ["hard-techno", "industrial-techno"],
    verificationStatus: "verified",
    spotify: sp("1lJhME1ZpzsEa5M0wW6Mso"),
    instagram: link("https://www.instagram.com/charlottedewittemusic/"),
    youtube: link("https://www.youtube.com/@charlottedewitte"),
    residentAdvisor: link("https://ra.co/dj/charlottedewitte"),
    tracks: [
      tr("Selected", "3kGr39dBiUUdFNw6iiLTDV", 2019, "8:02"),
      tr("Roar", "1FubT3w22RMHC3vreAL7cH", 2022, "4:45"),
      tr("Formula", "6R84ZlQF7gGkPB6o3GLZXB", 2021, "5:10"),
      tr("Apollo", "50OKS8aOeuiegMnJuPKUeN", 2022, "7:00"),
      tr("High", "34yR53qn56KlYXmhbuwjaa", 2023, "5:00"),
    ],
    sets: [st("Awakenings Festival 2017", "Awakenings", 2017, "I2Y2C3LSF5E")],
  },
  {
    slug: "hadone",
    name: "Hadone",
    country: "France",
    genres: ["hardgroove", "hard-techno", "industrial-techno"],
    verificationStatus: "verified",
    spotify: sp("4aSlYJptLO5PXv3jGueMkD"),
    instagram: link("https://www.instagram.com/hadone_/"),
    residentAdvisor: link("https://ra.co/dj/hadone"),
    sets: [st("Boiler Room x HEX Barcelona: Hard Dance", "Boiler Room", 2021, "t0UIy_vrCLY")],
  },
  {
    slug: "anetha",
    name: "Anetha",
    country: "France",
    genres: ["hard-techno", "schranz", "acid-techno"],
    verificationStatus: "verified",
    spotify: sp("7sJ3ngSMvvXGdVLnODPqXa"),
    instagram: link("https://www.instagram.com/anetha_/"),
    residentAdvisor: link("https://ra.co/dj/anetha"),
    sets: [st("Boiler Room Amsterdam", "Boiler Room", 2018, "Lg0Mkj4D9xo")],
  },
  {
    slug: "vendex",
    name: "Vendex",
    country: "Spain",
    genres: ["hard-techno", "industrial-techno"],
    verificationStatus: "partial",
    spotify: sp("2kqP3BXfLgo74OpfoC9cf7"),
  },
];
