import type { Genre } from "@/types";

const GENRE_MAP: Record<string, Genre> = {
  techno: "peak-time-techno",
  "hard techno": "hard-techno",
  "hardtechno": "hard-techno",
  schranz: "schranz",
  "industrial techno": "industrial-techno",
  "dark techno": "dark-techno",
  "peak time techno": "peak-time-techno",
  ebm: "ebm",
  "industrial ebm": "industrial-ebm",
  industrial: "industrial",
  darkwave: "darkwave",
  "post-punk": "post-punk",
  "post punk": "post-punk",
  "acid techno": "acid-techno",
  hardgroove: "hardgroove",
  "hypnotic techno": "hypnotic-techno",
  trance: "peak-time-techno",
  electronic: "peak-time-techno",
  "electronic music": "peak-time-techno",
};

/** Map external API genre strings to archive genres (best-effort). */
export function mapExternalGenres(external: string[]): Genre[] {
  const out = new Set<Genre>();
  for (const raw of external) {
    const key = raw.toLowerCase().trim();
    const mapped = GENRE_MAP[key];
    if (mapped) out.add(mapped);
    for (const [pattern, genre] of Object.entries(GENRE_MAP)) {
      if (key.includes(pattern)) out.add(genre);
    }
  }
  return [...out];
}
