"use client";

import { useState } from "react";
import { artists, genreLabels, moodLabels } from "@/content/artists";
import type { Genre, MoodTag } from "@/types";
import type { UserPreferences } from "@/types/preferences";
import { DEFAULT_PREFERENCES } from "@/types/preferences";
import { usePreferences } from "@/context/PreferencesContext";
import { Button } from "@/components/ui/Button";

const GENRE_OPTIONS = Object.entries(genreLabels).slice(0, 10) as [Genre, string][];
const MOOD_OPTIONS = Object.entries(moodLabels) as [MoodTag, string][];
const ARTIST_OPTIONS = artists.filter((a) => a.curationTier === 1).slice(0, 12);

export function OnboardingModal() {
  const { showOnboarding, completeOnboarding, dismissOnboarding } = usePreferences();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  if (!showOnboarding) return null;

  const toggleArtist = (slug: string) => {
    setDraft((d) => ({
      ...d,
      favoriteArtists: d.favoriteArtists.includes(slug)
        ? d.favoriteArtists.filter((s) => s !== slug)
        : [...d.favoriteArtists, slug].slice(0, 5),
    }));
  };

  const toggleGenre = (genre: Genre) => {
    setDraft((d) => ({
      ...d,
      favoriteGenres: d.favoriteGenres.includes(genre)
        ? d.favoriteGenres.filter((g) => g !== genre)
        : [...d.favoriteGenres, genre].slice(0, 4),
    }));
  };

  const toggleMood = (mood: MoodTag) => {
    setDraft((d) => ({
      ...d,
      favoriteMoods: d.favoriteMoods.includes(mood)
        ? d.favoriteMoods.filter((m) => m !== mood)
        : [...d.favoriteMoods, mood].slice(0, 4),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-border bg-surface p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Welcome</p>
        <h2 className="mt-2 font-serif text-2xl text-foreground">Tune your archive</h2>
        <p className="mt-2 text-sm text-muted-light">Lightweight preferences — stored locally, used for daily discovery.</p>

        {step === 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-foreground">Favorite artists</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ARTIST_OPTIONS.map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => toggleArtist(a.slug)}
                  className={`border px-3 py-1.5 text-sm ${
                    draft.favoriteArtists.includes(a.slug)
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-light"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground">Favorite genres</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {GENRE_OPTIONS.map(([g, label]) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`border px-3 py-1.5 text-sm ${
                      draft.favoriteGenres.includes(g)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-light"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Preferred BPM range</p>
              <p className="mt-2 font-mono text-accent">{draft.bpmRange[0]}–{draft.bpmRange[1]} BPM</p>
              <input
                type="range"
                min={120}
                max={170}
                value={draft.bpmRange[1]}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    bpmRange: [d.bpmRange[0], Number(e.target.value)] as [number, number],
                  }))
                }
                className="mt-3 w-full accent-accent"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-foreground">Favorite moods</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOOD_OPTIONS.map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMood(m)}
                  className={`border px-3 py-1.5 text-sm ${
                    draft.favoriteMoods.includes(m)
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted-light"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={() => completeOnboarding(draft)}>Start exploring</Button>
          )}
          <Button variant="outline" onClick={dismissOnboarding}>Skip for now</Button>
        </div>
      </div>
    </div>
  );
}
