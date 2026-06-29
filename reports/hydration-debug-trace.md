# Hydration Debug Trace Report

**Generated:** 2026-06-28  
**Symptom:** Server rendered `For My People`, client hydrated `Intergalactic Emotional Breakdown` (same row position, I Hate Models).

---

## Grep audit summary

| Pattern | Findings |
|---------|----------|
| `Math.random` | `src/lib/music.ts` — ID generation only (not render path) |
| `shuffle` | None |
| `sort(() => …)` | **`getEmergingArtists`** — unstable comparator (FIXED) |
| `Date.now` / `new Date` | `rotation.ts` (`halfDayIndex`, `weekIndex`), feed personalization, persistence (not initial track lists on artist pages) |
| `localStorage` | Library, preferences, playback persistence — loaded in `useEffect` after paint |
| `typeof window` | Guards in store loaders — return defaults on server |

---

## Root cause

### Primary: `getTracksByArtist` ignored editorial order

**File:** `src/content/tracks/index.ts` (formerly ~line 74–85)

**Before:**
```typescript
const fromCatalog = catalogTracks.filter((t) => t.artistId === id);
if (fromCatalog.length > 0) return fromCatalog;
```

`catalogTracks` is built via `artists.flatMap(...)`. Filtered results keep **global catalog insertion order**, not `artist.topTracks` editorial order.

For I Hate Models, editorial order starts with `Intergalactic Emotional Breakdown`, but catalog/global ordering could surface a different track first depending on pipeline merge timing (especially in dev HMR). A year-sorted path elsewhere (`getRecentlyAddedTracks`) puts `For My People` (2024) ahead of `Intergalactic` (2019) — matching the reported server/client title swap pattern.

### Secondary offenders (also fixed)

| Location | Issue |
|----------|--------|
| `src/lib/archive/curation/apply-tier.ts` `mergeTracks` | `Map` merge order non-obvious across environments |
| `src/lib/preferences/recommendations.ts` `getEmergingArtists` | `.sort(() => weekIndex() % 2 ? 1 : -1)` — invalid unstable sort |
| `WeeklyDiscoveriesMagazine.tsx` | `getWeeklyDiscoveriesEditorial()` uses `weekIndex()` / `halfDayIndex()` during render |
| `TodaysDiscovery.tsx` | `getTodaysDiscovery(preferences)` during render before preferences stable |
| `TrendingThisWeek.tsx` | `weekIndex()`-based slices during render |
| `getGenreEssentialTracks` | Unsorted `catalogTracks.filter().slice()` |

**Not the cause:** Zustand playback store / `PlaybackRoot` — affects play state only, not track list text.

---

## Fixes applied (no UI/layout/styling changes)

### 1. Deterministic `getTracksByArtist` (`src/content/tracks/index.ts`)

- Reorder by **`artist.topTracks`** canonical editorial sequence
- Append orphans with `sortCatalogTracksDeterministic` (title → year → id)
- Debug logs: `[SSR TRACKS]` / `[CLIENT TRACKS]` with track ids (dev only)

### 2. `sortCatalogTracksDeterministic` helper

Stable comparator: `title` → `releaseYear` → `id`

### 3. `mergeTracks` (`apply-tier.ts`)

Preserve secondary list order, append primary-only tracks — no `Map.values()` ambiguity.

### 4. `getEmergingArtists`

Replaced unstable sort with `name` → `slug` lexicographic sort.

### 5. Client components — personalize after mount

| Component | Pattern |
|-----------|---------|
| `WeeklyDiscoveriesMagazine` | `useState(getWeeklyDiscoveriesEditorialStatic)` + `useEffect` → live editorial |
| `TodaysDiscovery` | `useState(DEFAULT_PREFERENCES discovery)` + `useEffect` when preferences `ready` |
| `TrendingThisWeek` | Static initial artists/genres + `useEffect` for week-rotated data |

### 6. `getGenreEssentialTracks` / `getRecommendedTracks` / `getRecentlyAddedTracks`

Deterministic stable sorting before slice.

---

## Before / after — I Hate Models top tracks

**Before (catalog filter order — could diverge):**
```
Global filter order ≠ editorial order
Server first row example: For My People
Client first row example: Intergalactic Emotional Breakdown
```

**After (`getTracksByArtist('i-hate-models')`):**
```
[
  "Intergalactic Emotional Breakdown",
  "Two Steps From Heaven",
  "Spirals of Infinity",
  "Shades Of Night",
  "For My People",
  "Daydream",
  "Forever Melancholia",
  "Werewolf Disco Club",
  "Slave to the Rithm - I Hate Models Remix",
  "Toro - Speed Up Revival Edit"
]
```

SSR and client logs should now print identical id arrays:
```
[SSR TRACKS] artist=i-hate-models [ 'i-hate-models::intergalactic-emotional-breakdown', ... ]
[CLIENT TRACKS] artist=i-hate-models [ 'i-hate-models::intergalactic-emotional-breakdown', ... ]
```

---

## Verification

1. Hard-refresh `/artists/i-hate-models`
2. Open DevTools console — confirm `[SSR TRACKS]` and `[CLIENT TRACKS]` ids match
3. Confirm no React hydration warning on track title in Top tracks
4. First track row should be **Intergalactic Emotional Breakdown** on server and client

---

## Files changed

- `src/content/tracks/index.ts`
- `src/lib/archive/curation/apply-tier.ts`
- `src/lib/preferences/recommendations.ts`
- `src/content/home/feed.ts`
- `src/content/genres/index.ts`
- `src/components/home/WeeklyDiscoveriesMagazine.tsx`
- `src/components/home/TodaysDiscovery.tsx`
- `src/components/home/TrendingThisWeek.tsx`
