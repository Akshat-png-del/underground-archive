"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserPreferences } from "@/types/preferences";
import { DEFAULT_PREFERENCES } from "@/types/preferences";
import {
  hasCompletedOnboarding,
  loadPreferences,
  savePreferences,
} from "@/lib/preferences/store";

interface PreferencesContextValue {
  ready: boolean;
  preferences: UserPreferences;
  showOnboarding: boolean;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  completeOnboarding: (prefs: UserPreferences) => void;
  dismissOnboarding: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPreferences(loadPreferences());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    savePreferences(preferences);
  }, [preferences, ready]);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }, []);

  const completeOnboarding = useCallback((prefs: UserPreferences) => {
    setPreferences({ ...prefs, completedAt: new Date().toISOString() });
    setDismissed(true);
  }, []);

  const dismissOnboarding = useCallback(() => {
    setDismissed(true);
  }, []);

  const showOnboarding = ready && !dismissed && !hasCompletedOnboarding(preferences);

  const value = useMemo(
    () => ({
      ready,
      preferences,
      showOnboarding,
      updatePreferences,
      completeOnboarding,
      dismissOnboarding,
    }),
    [ready, preferences, showOnboarding, updatePreferences, completeOnboarding, dismissOnboarding]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
