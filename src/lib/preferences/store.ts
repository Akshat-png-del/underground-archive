import type { UserPreferences } from "@/types/preferences";
import { DEFAULT_PREFERENCES } from "@/types/preferences";

const STORAGE_KEY = "underground-archive-preferences-v1";

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function hasCompletedOnboarding(prefs: UserPreferences): boolean {
  return Boolean(prefs.completedAt);
}
