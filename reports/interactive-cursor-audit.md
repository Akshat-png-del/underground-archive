# Interactive Cursor & Hover Audit

**Date:** 2026-06-28  
**Scope:** Site-wide clickable elements — cursor, hover feedback  
**Verdict:** Fixed. Global baseline + targeted hover utilities applied.

---

## Problem

The mouse cursor stayed at the **default arrow** over most clickable UI. Only **3 files** (`TrackRow`, `TodaysDiscovery`, `ListeningPath`) had explicit `cursor-pointer`. The shared `Button` component and hundreds of `<Link>` / `<button>` elements relied on browser defaults, which Tailwind’s preflight does not guarantee as `pointer`.

---

## Root cause

1. **No global interactive cursor baseline** in `globals.css`
2. **`Button` lacked `cursor-pointer`** (and disabled `cursor-not-allowed`)
3. **Inconsistent hover utilities** — some cards had `hover-glow`, many list rows only had a bare `hover:border-accent` with no transition
4. **Hero / set thumbnails** were visual-only (no link wrapper) despite adjacent CTAs being clickable

---

## Fixes applied

### 1. Global baseline (`src/app/globals.css`)

`@layer base` rules for:

| Selector | Cursor |
|----------|--------|
| `a[href]` | `pointer` |
| `button:not(:disabled)` | `pointer` |
| `[role="button"]` | `pointer` |
| `label[for]`, `select`, `summary` | `pointer` |
| `input[type="checkbox/radio/range"]` | `pointer` |
| `button:disabled`, `[aria-disabled="true"]` | `not-allowed` |

### 2. Shared hover utilities (`globals.css`)

| Class | Use |
|-------|-----|
| `.interactive-row` | Search hits, library rows, set/playlist list items — border + background hover |
| `.chip-selectable` | Discover presets, onboarding toggles, admin filters, genre chips |
| `.interactive-ghost` | Icon/close controls (header menu, modal dismiss) |
| `.card-editorial` | Enhanced transition (transform, glow, opacity) — unchanged semantics |
| `.hover-glow` | Existing glow on card links — retained |

### 3. Component-level (`Button.tsx`)

- `cursor-pointer` on all variants
- `disabled:cursor-not-allowed`

### 4. Hero & thumbnail click targets

| Component | Change |
|-----------|--------|
| `ArtistOfWeekHero` | Hero image wrapped in `Link` to artist profile + opacity hover |
| `EssentialSetOfDayHero` | Set thumbnail wrapped in `Link` to set page + `image-zoom` |

### 5. Genre tags (artist profile)

Static `<Tag>` chips replaced with `chip-selectable` links to `/genres/[slug]`.

---

## Elements audited — previously missing pointer / hover

### Artist cards
| Location | Issue | Fix |
|----------|-------|-----|
| `ArtistCard.tsx` | No pointer/hover on card shell | `cursor-pointer` on link + `card-editorial hover-glow` |
| `ArtistGrid`, carousels | Inherited from `ArtistCard` | Covered by card fix |
| `HomePage`, `TrendingThisWeek`, `RecommendationStrip` | Carousel wrappers non-link (inner card is link) | Global `a` rule |

### Track cards / rows
| Location | Issue | Fix |
|----------|-------|-----|
| `TrackRow.tsx` | Play buttons had pointer; row border hover weak | Global `button` + `hover:border-accent/60` on row |
| `TodaysDiscovery` track card | Play buttons only | Global `button` (card shell intentionally partial-click) |
| `WeeklyDiscoveriesMagazine` | Track rows | `TrackRow` |

### Set cards
| Location | Issue | Fix |
|----------|-------|-----|
| `app/sets/page.tsx` | Set grid links | `interactive-row` + `card-editorial` |
| `WeeklyDiscoveriesMagazine`, `CommunityFavoritesHub`, `HomeRetentionSections` | Set links | `interactive-row` / existing `card-editorial` + global `a` |
| `GenrePageContent` | Essential sets list | `interactive-row` |
| `EssentialSetOfDayHero` | Thumbnail not clickable | Linked to set page |

### Profile portraits & hero images
| Location | Issue | Fix |
|----------|-------|-----|
| `ArtistOfWeekHero` | Hero not clickable | Linked to artist |
| `ArtistPageContent` | Portrait/hero decorative (on-page) | **No change** — not separate destinations |
| `SearchBar` / `ArtistAlphabetBrowse` | Portrait in list rows | `interactive-row` on parent link |

### Buttons
| Location | Issue | Fix |
|----------|-------|-----|
| `Button.tsx` | No cursor | `cursor-pointer` / `disabled:cursor-not-allowed` |
| `MusicActions`, `GlobalPlayer`, `ArtistSaveButton`, `ArtistFollowButton` | Used `Button` | Covered |
| `Header` mobile menu | Raw `<button>` | Global `button` + `interactive-ghost` |
| `FAQSection` | Accordion buttons | Global `button` (already had `hover:bg`) |
| `PlaylistModalContent` | Close / playlist pickers | `interactive-ghost` / `interactive-row` |

### Navigation links
| Location | Issue | Fix |
|----------|-------|-----|
| `Header.tsx` | Nav + logo links | Global `a` |
| `Footer.tsx` | Footer links | Global `a` |
| `Breadcrumbs.tsx` | Crumb links | Global `a` |
| `LibraryNav.tsx` | Library tabs | Global `a` + `interactive-row` |

### Recommendation & carousel items
| Location | Issue | Fix |
|----------|-------|-----|
| `HomeCarousel` / `CarouselItem` | Scroll container (not a click target) | **Default cursor** — correct |
| `TrendingThisWeek` genre cards | Links | Global `a` + `hover-glow` |
| `RecommendationStrip` | `ArtistCard` in carousel | Card fix |
| `HomeSection` “View all” | `<a href>` | Global `a` |

### Play buttons
| Location | Issue | Fix |
|----------|-------|-----|
| `TrackRow` artwork/title | `<button>` | Global `button` |
| `MusicActions` | `Button` | `Button` fix |
| `GlobalPlayer` | `Button` | `Button` fix |

### Filters & chips
| Location | Issue | Fix |
|----------|-------|-----|
| `app/discover/page.tsx` | Presets + collection cards | `chip-selectable` |
| `OnboardingModal.tsx` | Artist/genre/mood toggles | `chip-selectable` |
| `ArchiveAuditDashboard.tsx` | Admin filters | `chip-selectable` |
| `ArtistPageContent` | Genre tags | `chip-selectable` links |
| `GenrePageContent` | Related genre chips | `chip-selectable` |
| `ArtistCard` inline genre tags | Decorative only (nested inside artist link) | **Default cursor on tags** — avoids nested-link conflict |

### Search suggestions
| Location | Issue | Fix |
|----------|-------|-----|
| `SearchBar.tsx` | Autocomplete options | Global `a` + `interactive-row` |
| `SearchResults.tsx` | Result rows | `interactive-row` |
| `ArtistAlphabetBrowse.tsx` | Letter jump + artist rows | `chip-selectable` / `interactive-row` |

### External links
| Location | Issue | Fix |
|----------|-------|-----|
| `ArtistPageContent` | Spotify, YouTube, RA, etc. | Global `a` wrapping `Button` |
| `PlayerModal.tsx` | “Open in Spotify/YouTube” | Global `a` |
| `MusicActions` share | Clipboard API (button) | Global `button` |

### Lightbox triggers
| Finding |
|---------|
| **No lightbox component** exists in the codebase. `PlayerModal` is a details dialog (opened from global player “View details”), not a pre-playback gate. Modal open/close controls use `Button` / `interactive-ghost`. |

---

## Intentionally non-interactive (default cursor)

| Element | Reason |
|---------|--------|
| Text inputs / textareas | Text cursor |
| `HomeCarousel` scroll track | Drag/scroll, not navigate |
| `SocialBadge`, mood pills on genre guide | Display-only labels |
| Set category pills on `/sets` | Display-only taxonomy |
| Artist page portrait on own profile | No separate destination |
| `iframe` embeds (YouTube, Spotify) | Embedded player handles its own UI |
| Disabled buttons | `not-allowed` |

---

## Files changed

- `src/app/globals.css` — base cursor rules + utility classes
- `src/components/ui/Button.tsx`
- `src/components/artists/ArtistCard.tsx`
- `src/components/artists/ArtistPageContent.tsx`
- `src/components/artists/ListeningPath.tsx`
- `src/components/search/SearchBar.tsx`
- `src/components/search/SearchResults.tsx`
- `src/components/search/ArtistAlphabetBrowse.tsx`
- `src/app/discover/page.tsx`
- `src/app/sets/page.tsx`
- `src/app/genres/page.tsx`
- `src/components/layout/Header.tsx`
- `src/components/library/LibraryNav.tsx`
- `src/components/library/LibraryProfile.tsx`
- `src/components/library/LibraryPlaylists.tsx`
- `src/components/library/PlaylistModalContent.tsx`
- `src/components/home/ArtistOfWeekHero.tsx`
- `src/components/home/EssentialSetOfDayHero.tsx`
- `src/components/home/HomeRetentionSections.tsx`
- `src/components/genres/GenrePageContent.tsx`
- `src/components/admin/ArchiveAuditDashboard.tsx`
- `src/components/onboarding/OnboardingModal.tsx`
- `src/components/music/TrackRow.tsx`
- `src/components/music/GlobalPlayer.tsx`

---

## Manual verification checklist

1. Hover artist cards, set cards, carousel items → **pointer** + lift/glow
2. Hover track row artwork, title, play icon → **pointer**
3. Hover header nav, footer, breadcrumbs → **pointer** + color change
4. Hover search autocomplete rows → **pointer** + row highlight
5. Hover discover presets / onboarding chips → **pointer** + border highlight
6. Hover disabled button → **not-allowed**
7. Hover plain text / inputs → **default / text** (not pointer)
8. Hover Artist of the Week hero image → **pointer** → navigates to artist
9. Hover Essential Set thumbnail → **pointer** → navigates to set

---

## Target status

**Met:** No clickable element should display the default arrow cursor. Interactive controls use `pointer`; disabled controls use `not-allowed`; non-interactive content keeps appropriate defaults.
