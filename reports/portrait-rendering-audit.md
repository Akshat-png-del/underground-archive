# Portrait Rendering Audit

Generated: 2026-06-28T20:51:32.708Z

## Summary

| Metric | Count |
|--------|------:|
| Artists | 150 |
| Portraits resolved (renderable) | 150 |
| Hero images resolved (renderable) | 150 |
| Portrait = hero (same URL) | 0 |
| Display issues | 29 |

## Root causes addressed

1. **Missing local researched files** — `/images/portraits/researched/*.jpg` referenced in verified registry but absent from `public/`. Display layer now prefers remote ingested CDN URLs.
2. **Hero = portrait collapse** — `applyArtistImage` and builder now derive hero from essential-set stills or `/images/hero-atmospheric.svg`.
3. **Incomplete fallback chains** — `resolvePortraitFallbacksForDisplay` adds ingested Spotify/YouTube URLs before genre SVG.
4. **Component bypass** — `ArtistCard` and browse components now use `resolvePortrait(artist)` with full artist + image metadata.
5. **CDN optimization** — `SafeImage` marks Spotify, YouTube, RA, Discogs as `unoptimized` to avoid optimizer blocks.

## Failed portraits

- **Petduo** (`petduo`) — local-researched-without-remote-fallback: `/images/portraits/researched/petduo.jpg`
- **Assemblage 23** (`assemblage-23`) — local-researched-without-remote-fallback: `/images/portraits/researched/assemblage-23.jpg`
- **Hante** (`hante`) — local-researched-without-remote-fallback: `/images/portraits/researched/hante.jpg`
- **She Past Away** (`she-past-away`) — local-researched-without-remote-fallback: `/images/portraits/researched/she-past-away.jpg`
- **Lebanon Hanover** (`lebanon-hanover`) — local-researched-without-remote-fallback: `/images/portraits/researched/lebanon-hanover.jpg`
- **Drab Majesty** (`drab-majesty`) — local-researched-without-remote-fallback: `/images/portraits/researched/drab-majesty.jpg`
- **Rumina** (`rumina`) — local-researched-without-remote-fallback: `/images/portraits/researched/rumina.jpg`
- **Per-sona** (`per-sona`) — local-researched-without-remote-fallback: `/images/portraits/researched/per-sona.jpg`
- **The Soft Moon** (`the-soft-moon`) — local-researched-without-remote-fallback: `/images/portraits/researched/the-soft-moon.jpg`
- **Rrose** (`rrose`) — local-researched-without-remote-fallback: `/images/portraits/researched/rrose.jpg`
- **Blawan** (`blawan`) — local-researched-without-remote-fallback: `/images/portraits/researched/blawan.jpg`
- **PH87** (`ph87`) — local-researched-without-remote-fallback: `/images/portraits/researched/ph87.jpg`
- **Part Time Killer** (`part-time-killer`) — local-researched-without-remote-fallback: `/images/portraits/researched/part-time-killer.jpg`
- **Lucy** (`lucy`) — local-researched-without-remote-fallback: `/images/portraits/researched/lucy.jpg`
- **Victor Ruiz** (`victor-ruiz`) — local-researched-without-remote-fallback: `/images/portraits/researched/victor-ruiz.jpg`
- **Josh Wink** (`josh-wink`) — local-researched-without-remote-fallback: `/images/portraits/researched/josh-wink.jpg`
- **Ansome** (`ansome`) — local-researched-without-remote-fallback: `/images/portraits/researched/ansome.jpg`
- **D.A.V.E. The Drummer** (`dave-the-drummer`) — local-researched-without-remote-fallback: `/images/portraits/researched/dave-the-drummer.jpg`
- **Paranoid London** (`paranoid-london`) — local-researched-without-remote-fallback: `/images/portraits/researched/paranoid-london.jpg`
- **Randomer** (`randomer`) — local-researched-without-remote-fallback: `/images/portraits/researched/randomer.jpg`
- **Héctor Oaks** (`hector-oaks`) — local-researched-without-remote-fallback: `/images/portraits/researched/hector-oaks.jpg`
- **Alex Bau** (`alex-bau`) — local-researched-without-remote-fallback: `/images/portraits/researched/alex-bau.jpg`
- **Weichentechnikk** (`weichentechnikk`) — local-researched-without-remote-fallback: `/images/portraits/researched/weichentechnikk.jpg`
- **Petra Flurr** (`petra-flurr`) — local-researched-without-remote-fallback: `/images/portraits/researched/petra-flurr.jpg`
- **Front 242** (`front-242`) — local-researched-without-remote-fallback: `/images/portraits/researched/front-242.jpg`
- **Deepbass** (`deepbass`) — local-researched-without-remote-fallback: `/images/portraits/researched/deepbass.jpg`
- **Nørbak** (`norbak`) — local-researched-without-remote-fallback: `/images/portraits/researched/norbak.jpg`
- **L.F.T.** (`lft`) — local-researched-without-remote-fallback: `/images/portraits/researched/lft.jpg`
- **MCR-T** (`mcr-t`) — local-researched-without-remote-fallback: `/images/portraits/researched/mcr-t.jpg`

## Failed hero images

_None after display resolution._

## Blocked domains (policy)

- `pinterest.com`
- `pin.it`
- `lookaside.fbsbx.com`

## Allowed remote patterns (next.config)

- `img.youtube.com`
- `i.scdn.co`
- `scdn.co`
- `spotifycdn.com`
- `ytimg.com`
- `ggpht.com`
- `discogs.com`
- `ra.co`

## Broken local paths (data references, file missing)

_None (SVG assets present)._

## Components fixed

- `ArtistCard` — full artist object + `resolvePortrait` / display fallbacks
- `ArtistPageContent` — separate hero + profile sources
- `ArtistOfWeekHero` — `resolveHeroImage`
- `ArtistAlphabetBrowse` — display resolver (was raw `artist.portrait`)
- `TodaysDiscovery` — display fallbacks
- `SafeImage` — broader unoptimized CDN list

## Components using correct image logic

- `ArtistGrid`, `ArtistCard`, `ArtistPageContent`, `ArtistOfWeekHero`
- `TodaysDiscovery`, `ArtistAlphabetBrowse`
- All `ArtistCard` call sites (discover, home, library, recommendations)

## Remaining gaps

- 29 artists with local researched paths and no ingested remote URL — fall back to genre SVG via SafeImage chain
- Sync researched JPEGs to `public/images/portraits/researched/` with `npm run sync:portraits` for offline-verified assets (optional, does not modify registry)
