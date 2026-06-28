import type { Genre, MoodTag } from "@/types";

export interface UserPreferences {
  completedAt?: string;
  favoriteArtists: string[];
  favoriteGenres: Genre[];
  bpmRange: [number, number];
  favoriteMoods: MoodTag[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  favoriteArtists: [],
  favoriteGenres: [],
  bpmRange: [140, 155],
  favoriteMoods: [],
};
