# Production Readiness Report

**Generated:** 2026-06-28  
**Target:** No broken media · No console errors · No silent empty states · Lighthouse > 90  
**Verdict:** **Not production-ready** — build fails; performance below target; several fixable blockers remain.

---

## Executive summary

| Area | Status | Score / Notes |
|------|--------|----------------|
| **Production build** | ❌ FAIL | TypeScript error blocks `next build` |
| **Broken media** | ⚠️ Partial | 0 broken remote URLs in audits; 3 intentional genre placeholders; missing `/og-default.jpg` |
| **Console errors** | ✅ Pass (home) | Lighthouse `errors-in-console`: 100; invalid HTML patterns may still warn in dev |
| **Empty states** | ⚠️ Partial | Library/search covered; genre track/set sections hide silently |
| **Lighthouse (home, dev)** | ❌ Below target | Perf **71** · A11y **93** · BP **100** · SEO **100** |
| **Mobile responsiveness** | ✅ Good | Viewport configured; responsive grids/carousels; sticky nav |
| **Hydration** | ❌ Risk | Time-rotated client sections; locale date formatting |
| **SEO metadata** | ⚠️ Partial | 19/22 public routes complete; admin/offline gaps |
| **Structured data** | ⚠️ Partial | Global org/website only on most pages; SearchAction URL wrong |

---

## 1. Production build

```
npm run build → FAILED at TypeScript check
```

**Error:** `scripts/audit-tier3-catalog.ts:169` — `artist.slug` (string) not assignable to `COLLECTION_SLUGS` union type.

**Impact:** Cannot ship a production bundle. `prebuild` runs archive + image audits (pass), then build fails on unrelated script type error because `tsconfig.json` includes `**/*.ts` (all scripts).

**Fix (P0):** Exclude `scripts/` from Next.js typecheck, or fix the type in `audit-tier3-catalog.ts`.

---

## 2. Media & fallbacks

### Automated audits (latest)

| Audit | Result |
|-------|--------|
| `audit:images` | **0** broken URLs · **0** suspicious · 150/150 display coverage |
| `audit:track-artwork` | **0** issues across 781 tracks / 301 releases |
| `audit:archive` | **0** broken profiles · 55 suspicious (curation gaps, not 404s) |
| Portrait coverage | **147/150** with portraits · **3** genre SVG placeholders (documented) |

### Fallback chain

`SafeImage` provides:
- Multi-URL fallback chain (`src` → `fallbacks` → `/images/artist-fallback.svg`)
- Pulse placeholder while loading (reduces perceived CLS)
- Spotify/YouTube CDN `unoptimized` + blur placeholder for remote images
- Native `<img>` for local SVG paths

`TrackArtwork` falls back to genre SVG when Spotify hash missing.

### Gaps

| Issue | Severity | Detail |
|-------|----------|--------|
| Missing OG default image | **High** | `siteConfig.ogImage` = `/og-default.jpg` — **file not in `public/`**. All pages without custom `ogImage` reference a 404 in Open Graph/Twitter cards. |
| Artist pages omit `ogImage` | **Medium** | `generateMetadata` in `artists/[slug]/page.tsx` does not pass `artist.portrait` |
| 3 genre placeholders | **Low** | `len-d`, `debora-alessio`, `psyk32` — intentional, with messaging in portrait audit |
| Researched local portrait paths | **Low** | `/images/portraits/researched/*.jpg` referenced in registry; files not in repo (runtime falls back via `SafeImage`) |

---

## 3. Console errors & invalid HTML

### Lighthouse (home `/`, dev server)

| Audit | Score |
|-------|-------|
| `errors-in-console` | **100** (0 errors detected) |
| `valid-source-maps` | 0 (dev-only; not a production concern) |

### Invalid DOM patterns (likely dev-console warnings)

| Pattern | Locations | Risk |
|---------|-----------|------|
| `<Link><Button>` → `<a><button>` | `HomePage`, `ArtistOfWeekHero`, `EssentialSetOfDayHero`, `HomeFollowingStrip`, `SetDetail`, `ArtistPageContent`, `community/page`, `offline/page` | HTML validation + a11y |
| `<ol>` → `TrackRow` (`<div>`) | `ArtistMusicSection`, `WeeklyDiscoveriesMagazine`, `GenrePageContent`, `LibraryLikedTracks`, `HomePersonalizedStrip`, `HomeRetentionSections` | Semantics + screen readers |

**Fix (P1):** Style `Link` as button, or add `asChild` pattern to `Button`. Wrap `TrackRow` in `<li>` or change `TrackRow` root to `<li>`.

---

## 4. Hydration issues

| Component | Issue | Severity |
|-----------|-------|----------|
| `TodaysDiscovery.tsx` | `getTodaysDiscovery()` uses `halfDayIndex()` at render — differs after 12h rotation vs prerender | **High** |
| `TrendingThisWeek.tsx` | `weekIndex()` rotation | **High** |
| `WeeklyDiscoveriesMagazine.tsx` | `weekIndex()` + `halfDayIndex()` | **High** |
| `SetDetail.tsx` | `toLocaleDateString()` without fixed locale — server vs browser mismatch | **High** |

**Safe patterns already in use:**
- `HomePage` server component passes frozen props to `ArtistOfWeekHero` / `EssentialSetOfDayHero`
- `LibraryContext` / `PreferencesContext` defer localStorage reads to `useEffect`
- `useSearchParams` wrapped in `Suspense` (Header, SearchResults, AdminLogin)

**Fix (P1):** Move rotation logic to server `HomePage` props, or gate client sections behind `mounted` state. Use `toLocaleDateString('en-US', { dateStyle: 'medium' })` or `suppressHydrationWarning` on date element.

---

## 5. Broken links

### Internal navigation

| Check | Result |
|-------|--------|
| Nav links (`site.ts`) | All routes exist (`/`, `/artists`, `/sets`, `/genres`, `/discover`, `/editorial`, `/library`) |
| `similarArtists` dead slugs | `helene-hauff` referenced in catalog but **no artist profile** — filtered at render (`getArtist` null check) so **no 404 links shown** |
| Archive audit `MISSING_SIMILAR` | Flagged in data quality audit, not user-facing broken links |

### Structured data broken target

```json
"target": "{siteUrl}/discover?q={search_term_string}"
```

**Problem:** `/discover` does **not** read `q` search param. Global search submits to `/search?q=…`.

**Fix (P1):** Change `websiteSchema()` target to `/search?q={search_term_string}`.

---

## 6. Layout shifts (CLS)

| Signal | Result |
|--------|--------|
| Lighthouse CLS (home) | **100** |
| `SafeImage` pulse skeleton | Present while images load |
| Font loading | `display: swap` on all Google fonts |
| Hero images | `sizes` attributes on key heroes |

### LCP concern (performance)

| Metric (home, dev) | Value | Score |
|--------------------|-------|-------|
| LCP | **8.2 s** | 2 |
| FCP | 1.0 s | 100 |
| TBT | 190 ms | 91 |
| Speed Index | 3.7 s | 85 |
| TTI | 8.3 s | 39 |

**Note:** Measured against **dev server** (`next dev`), not optimized production build (build currently fails). Production LCP will differ but likely still below 90 without image priority/code-splitting work.

**Fix (P1):** `priority` on LCP hero image, reduce client JS on home (`unused-javascript` audit: ~336 KiB savings), verify production build metrics after fixing build.

---

## 7. Mobile responsiveness

| Check | Status |
|-------|--------|
| Viewport meta | `width=device-width, initialScale=1` in root layout |
| Header | Sticky `h-14`; search hidden on mobile menu |
| Grids | `grid-cols-2 md:grid-cols-3` patterns throughout |
| Carousels | `HomeSection` horizontal scroll with `snap-x`, hidden scrollbar |
| Typography | `text-3xl sm:text-4xl` scaling on headings |
| Touch targets | Letter jump buttons `min-w-[1.75rem]` — slightly small; acceptable for secondary nav |
| Admin table | `overflow-x-auto` + `min-w-[960px]` — admin only |

**No critical mobile layout breaks identified in code review.**

---

## 8. SEO metadata

### Infrastructure

- `buildMetadata()` — title, description, canonical, openGraph, twitter, robots
- `robots.ts` — allows `/`, disallows `/admin/`, `/dashboard/`, `/api/admin/`
- `sitemap.ts` — static pages + all artist/genre/set/editorial slugs

### Page coverage

| Status | Routes |
|--------|--------|
| ✅ Complete (`buildMetadata`) | `/artists`, `/artists/[slug]`, `/genres`, `/genres/[slug]`, `/discover`, `/sets`, `/sets/[slug]`, `/editorial`, `/editorial/[slug]`, `/community`, `/search`, `/library/*`, `/playlists/[id]` |
| ✅ Home | Inherited from root `layout.tsx` |
| ❌ Missing | `/admin/login`, `/offline` — inherit home title/canonical |
| ⚠️ Partial | `/admin/archive-audit` — title + noindex only |

### Gaps

| Issue | Severity |
|-------|----------|
| Missing `/og-default.jpg` | **High** |
| Library/playlist pages indexable | **Medium** — user-specific; should use `noIndex: true` |
| Sitemap omits `/library/tracks`, `/library/playlists`, etc. | **Low** |
| Artist/set/editorial pages don't pass hero/portrait as `ogImage` | **Medium** |

---

## 9. Structured data (JSON-LD)

| Page | Schemas |
|------|---------|
| All pages | `Organization`, `WebSite` (+ broken SearchAction) |
| `/artists/[slug]` | `MusicGroup`, `BreadcrumbList` |
| `/editorial/[slug]` | `Article`, `BreadcrumbList` |

### Missing JSON-LD (recommended)

| Page | Suggested schema |
|------|------------------|
| `/sets/[slug]` | `VideoObject` or `MusicEvent` (`placeSchema()` exists but unused) |
| `/genres/[slug]` | `CollectionPage` + breadcrumb |
| `/artists`, `/sets`, `/editorial` index | `ItemList` |
| `/search` | Already covered by fixed `SearchAction` on WebSite |

---

## 10. Empty states

| Area | Messaging | Status |
|------|-----------|--------|
| Search (no results) | "No matches. Try a different spelling…" | ✅ |
| Search (empty query) | A–Z artist browse | ✅ |
| Discover (no filters match) | Empty state copy | ✅ |
| Library (tracks/sets/artists/playlists/history) | Dedicated empty copy | ✅ |
| Playlist page | Empty playlist message | ✅ |
| Genre — no artists | "No artists yet." | ✅ |
| Genre — no tracks/sets | Sections hidden entirely | ❌ **Silent** |
| Home personalized strips | `return null` when no activity | ✅ Intentional hide |
| Recommendation strip | `return null` when empty | ✅ Intentional hide |

**Fix (P2):** Show genre section headings with "No sets archived for this genre yet" when arrays are empty.

---

## 11. Lighthouse scorecard

**Environment:** `http://localhost:3000` (dev server) · Chrome headless · 2026-06-28

| Category | Score | Target | Pass? |
|----------|-------|--------|-------|
| Performance | **71** | > 90 | ❌ |
| Accessibility | **93** | > 90 | ✅ |
| Best practices | **100** | > 90 | ✅ |
| SEO | **100** | > 90 | ✅ |

**Primary performance drag:** LCP 8.2s (hero/images + dev bundle). Re-test on production build after fixing build blocker.

---

## 12. Priority fix list

### P0 — Ship blockers

1. Fix TypeScript error in `scripts/audit-tier3-catalog.ts` (or exclude `scripts/` from build typecheck)
2. Add `public/og-default.jpg` (1200×630) or change `siteConfig.ogImage` to an existing asset

### P1 — Production quality

3. Fix hydration: server-side rotation props or client mount gate on `TodaysDiscovery`, `TrendingThisWeek`, `WeeklyDiscoveriesMagazine`
4. Fix `SetDetail` date locale (`en-US` fixed locale)
5. Fix invalid HTML: `Link`+`Button` nesting (8 locations), `ol`+`TrackRow` (6 locations)
6. Fix JSON-LD SearchAction: `/discover?q=` → `/search?q=`
7. Pass `ogImage: artist.portrait` in artist `generateMetadata`
8. Re-run Lighthouse on **production** `next start` after build passes; optimize LCP (priority images, JS splitting)

### P2 — Polish

9. `noIndex: true` on `/library/*`, `/playlists/[id]`, `/admin/login`, `/offline`
10. Genre page empty track/set messaging
11. JSON-LD on set and genre detail pages
12. Remove or resolve `helene-hauff` from `similarArtists` arrays in catalog

---

## 13. Checklist vs targets

| Target | Met? | Evidence |
|--------|------|----------|
| No broken media | ⚠️ | Remote URLs clean; OG image 404; 3 genre placeholders documented |
| No console errors | ✅* | Lighthouse clean on home; invalid HTML may warn in dev tools |
| No empty states without messaging | ⚠️ | Genre track/set sections silent |
| Lighthouse > 90 (all categories) | ❌ | Performance 71 on home (dev) |

---

## 14. Recommended sign-off sequence

```bash
# 1. Fix build blocker, then:
npm run build && npm start

# 2. Re-run audits
npm run audit:archive && npm run audit:images && npm run audit:track-artwork

# 3. Lighthouse (production)
npx lighthouse http://localhost:3000 --only-categories=performance,accessibility,best-practices,seo --view

# 4. Manual smoke test
# - Home, artist, set, genre, search (autocomplete + A-Z browse)
# - Mobile viewport (375px): header menu, carousels, search dropdown
# - Offline PWA fallback (/offline)
```

---

*Report generated from automated audits, production build attempt, Lighthouse run, and static code analysis.*
