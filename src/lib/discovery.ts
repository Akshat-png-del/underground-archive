import type { DiscoveryFilters } from "@/types";
import { artists } from "@/content/artists";

export const DISCOVERY_PRESETS: { id: string; label: string; filters: DiscoveryFilters }[] = [
  { id: "90s-industrial", label: "90s Industrial", filters: { era: "1990s", genre: "industrial-techno" } },
  { id: "peak-chaos", label: "Peak-Time Chaos", filters: { preset: "peak-chaos", genre: "peak-time-techno", energy: 8.5 } },
  { id: "warehouse-energy", label: "Warehouse", filters: { preset: "warehouse", mood: "aggressive", bpmMin: 145 } },
  { id: "industrial", label: "Industrial", filters: { genre: "industrial-techno", mood: "industrial" } },
  { id: "dark-atmospheric", label: "Atmospheric", filters: { preset: "dark", genre: "dark-techno", mood: "dark" } },
  { id: "acidic", label: "Acidic", filters: { genre: "acid-techno", mood: "hypnotic" } },
  { id: "hypnotic", label: "Hypnotic", filters: { mood: "hypnotic", genre: "hypnotic-techno" } },
  { id: "hardgroove", label: "Hardgroove", filters: { genre: "hardgroove" } },
];

export function discoverArtists(filters: DiscoveryFilters) {
  return artists.filter((artist) => {
    if (filters.genre && !artist.genres.includes(filters.genre)) return false;
    if (filters.country && artist.country.toLowerCase() !== filters.country.toLowerCase()) return false;
    if (filters.mood && !artist.moodTags.includes(filters.mood)) return false;
    if (filters.bpmMin && artist.bpmRange[1] < filters.bpmMin) return false;
    if (filters.bpmMax && artist.bpmRange[0] > filters.bpmMax) return false;
    if (filters.energy && artist.soundScores.energy < filters.energy) return false;
    if (filters.darkness && artist.soundScores.darkness < filters.darkness) return false;
    if (filters.label && !artist.labels.some((l) => l.toLowerCase().includes(filters.label!.toLowerCase()))) return false;
    if (filters.era) {
      const decade = parseInt(filters.era.replace(/\D/g, ""), 10);
      if (artist.activeSince > decade + 9 || artist.activeSince < decade) return false;
    }
    return true;
  });
}
