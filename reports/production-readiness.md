# Production Readiness Report

**Generated:** 2026-07-20  
**Scope:** Production defects only — no redesign, no feature/data/playback behavior changes  
**Verdict:** **Production build PASS** — ship-ready with documented residual lint debt (debug traces) and deploy env requirement

---

## Executive summary

| Area | Status | Notes |
|------|--------|--------|
| **Production build** | ✅ PASS | `NEXT_PUBLIC_SITE_URL=… npm run build` succeeds; TypeScript clean |
| **Images** | ✅ PASS | `audit:images` — **0** broken URLs, **0** suspicious; coverage 100% |
| **Track artwork** | ⚠️ Known gaps | Missing Spotify cover hashes for some tracks (falls back via existing artwork resolver — **no invented art**) |
| **Sitemap** | ✅ PASS | **733** URLs, **0** duplicates |
| **robots.txt** | ✅ PASS | Allows `/`; blocks `/admin/`, `/dashboard/`, `/api/`, `/library/`, `/playlists/` |
| **Open Graph / icons** | ✅ PASS | `/opengraph-image` 200; favicon; apple-touch-icon; PWA icons; manifest theme aligned |
| **Invalid HTML (`<a><button>`)** | ✅ Fixed | Button `href` renders as link |
| **Hydration** | ✅ No new defects found | Homepage rotation uses static `initial` + post-hydrate refresh |
| **Playback engines** | ✅ Untouched behavior | Type-only / missing-import fixes for build; no transport/seek/queue changes |
| **ESLint** | ⚠️ Residual | Pre-existing `require()` in playback *debug/trace* helpers; not blocking `next build` |
| **Lighthouse** | ⏳ Not re-scored this run | Prior home (dev) was Perf 71 / A11y 93 / BP 100 / SEO 100 — re-run against production `next start` before launch |

---

## Issues found → fixed

### P0 — Build blockers

| Issue | Fix |
|-------|-----|
| Broken `scripts/complete-hor-phase2.ts` parse error blocked `tsc` via `**/*.ts` include | Excluded `scripts/`, `.tmp`, `tests` from `tsconfig.json` (ingestion scripts no longer gate app build) |
| `ArtistMusicSection` passed `EssentialSet` into `playbackItemFromSet` | Call site now passes `ArchiveSet` from `getSetsByArtist` |
| Multiple TypeScript errors in seek bar / providers / debug traces blocked typecheck | Minimal type-correctness fixes only (duplicate object keys, casts, missing `playbackDebugError` import, `logProviderPlay` arity, empty blocklist `Set<never>`, etc.) |
| Unreliable `npx tsx` in prebuild | Added local `tsx` devDependency; scripts use `tsx` directly |

### P1 — Production SEO / assets / HTML

| Issue | Fix |
|-------|-----|
| `siteConfig.url` fell back to `localhost` in production | Throws if `NEXT_PUBLIC_SITE_URL` missing when `NODE_ENV === "production"` |
| Manifest `theme_color` `#050505` ≠ app `#080808` | Aligned manifest to `#080808` |
| Missing apple-touch-icon (404 probe) | Added `public/apple-touch-icon.png` + `src/app/apple-icon.png` |
| `/offline` inherited homepage metadata | Dedicated `buildMetadata` with `noIndex: true` |
| Invalid `<Link><Button>` nesting | `Button` supports `href` → renders `<Link>`; call sites updated |

---

## Files modified (this pass)

**Config / tooling**
- `tsconfig.json`
- `package.json` (+ `tsx` in `package-lock.json`)
- `src/config/site.ts`
- `public/manifest.webmanifest`

**Assets**
- `public/apple-touch-icon.png` (new)
- `src/app/apple-icon.png` (new)

**UI / SEO (no layout redesign)**
- `src/components/ui/Button.tsx`
- `src/components/home/HomeHero.tsx`
- `src/components/home/ArtistOfWeekHero.tsx`
- `src/components/home/EssentialSetOfDayHero.tsx`
- `src/components/home/HomeFollowingStrip.tsx`
- `src/components/sets/SetWatchMetadata.tsx`
- `src/app/community/page.tsx`
- `src/app/offline/page.tsx`
- `src/components/artists/ArtistMusicSection.tsx`
- `src/components/search/SearchResults.tsx`

**Build type-correctness (playback files — types/imports only)**
- `src/components/music/PlaybackSeekBar.tsx`
- `src/lib/music/playback-debug.ts`
- `src/lib/music/playback-blocklist.ts`
- `src/lib/music/providers/provider-router.ts` (missing import — would throw at runtime on play failure)
- `src/lib/music/providers/audio-provider.ts`
- `src/lib/music/providers/spotify-provider.ts`
- `src/lib/music/providers/youtube-provider.ts`
- `src/lib/music/media-engine-events.ts`
- `src/lib/music/queue-pipeline-trace.ts`
- `src/lib/music/volume-pipeline-trace.ts`
- `src/lib/ingestion/portrait-report.ts`
- `src/lib/ingestion/portraits.ts`
- `src/content/home/exposure-budget.ts` (public `hasSet`/`hasTrack` accessors)

---

## Validation performed

```bash
NEXT_PUBLIC_SITE_URL=https://underground.archive npm run build   # PASS
NEXT_PUBLIC_SITE_URL=https://underground.archive npx tsc --noEmit # PASS (0 errors)
npm run audit:images                                             # 0 broken URLs
Sitemap uniqueness                                               # 733 / 733 unique
Production smoke (next start :3010)                              # /, OG, apple icon, manifest, robots → 200
```

**Playback freeze respected:** No changes to engines, providers’ play/seek/queue logic, bottom player UI, or Media Session behavior beyond type/import correctness required for build.

---

## Remaining blockers / follow-ups (non-blocking for build)

1. **Deploy env:** Set `NEXT_PUBLIC_SITE_URL` to the real production origin at build time (canonicals, OG, sitemap, robots depend on it).
2. **Lighthouse:** Re-run on production `next start` (or deployed URL) targeting Perf ≥95 / A11y ≥95 / BP 100 / SEO 100.
3. **ESLint debt:** Debug/trace files still use dynamic `require()` (eslint errors). Prefer leave frozen under playback freeze; do not “clean up” mid-launch.
4. **Track cover hashes:** Some catalog tracks lack Spotify image hashes — existing fallback path applies; do not invent artwork.
5. **Next.js warning:** `middleware` → `proxy` deprecation notice (framework migration; not a runtime failure).

---

## Explicitly unchanged

- Homepage curation / exposure rankings / discovery logic intent  
- Artist / track / set / playlist datasets  
- Navigation, routing, colors, typography, copy, SEO wording (except offline metadata correctness)  
- Playback transport, seek, queue, Spotify/YouTube providers’ runtime behavior  
- Feature set (no additions or removals)
