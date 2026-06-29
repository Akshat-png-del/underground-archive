# Playback Coverage Audit

Generated: 2026-06-28T21:36:35.715Z

## Summary

| Metric | Count |
|--------|------:|
| Total playable entities audited | 1555 |
| Working (resolvable source) | 741 |
| Failed / no source | 814 |
| Missing URLs | 814 |
| Invalid URLs | 0 |
| Unsupported / unresolved | 0 |
| UI files with inline iframes | 0 |

## Coverage by surface

| Surface | Total | Working | % |
|---------|------:|--------:|--:|
| archive-sets | 241 | 241 | 100% |
| catalog-releases | 301 | 141 | 47% |
| catalog-tracks | 781 | 236 | 30% |
| homepage-featured-sets | 2 | 2 | 100% |
| homepage-featured-tracks | 3 | 3 | 100% |
| listening-path | 167 | 58 | 35% |
| recommended-tracks-sample | 60 | 60 | 100% |

## Source resolution

- **Sets**: YouTube (`youtubeId`) first, then Spotify fallback
- **Tracks**: Spotify track URL → YouTube → Spotify album
- **Releases**: Spotify embed
- **Engine**: Single global iframe + optional HTML5 preview on `document.body`

## Components bypassing global player

No inline iframes found under `src/components/`.

## Failed entities (sample)

| Surface | Type | Title | Issue |
|---------|------|-------|-------|
| catalog-tracks | track | Azyr | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Warehouse Pressure | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Peak Hour | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Distorted Dreams | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Night Shift | Track missing Spotify or YouTube URL |
| catalog-tracks | track | MRD | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Warehouse Pressure | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Peak Hour | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Distorted Dreams | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Night Shift | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Nico Moreno | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Warehouse Pressure | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Peak Hour | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Distorted Dreams | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Night Shift | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Alarico | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Warehouse Pressure | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Peak Hour | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Distorted Dreams | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Night Shift | Track missing Spotify or YouTube URL |
| catalog-tracks | track | CRAVET | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Warehouse Pressure | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Peak Hour | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Distorted Dreams | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Night Shift | Track missing Spotify or YouTube URL |
| catalog-tracks | track | VNTM | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Warehouse Pressure | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Peak Hour | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Distorted Dreams | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Night Shift | Track missing Spotify or YouTube URL |
| catalog-tracks | track | JKS | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Warehouse Pressure | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Peak Hour | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Distorted Dreams | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Night Shift | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Rikhter | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Warehouse Pressure | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Peak Hour | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Distorted Dreams | Track missing Spotify or YouTube URL |
| catalog-tracks | track | Night Shift | Track missing Spotify or YouTube URL |

*…and 774 more.*

## UI wiring (global `player.play()`)

All playable surfaces route through `usePlaybackStore.play()` → `globalPlayerEngine.play()`:

- `TrackRow` — tracks
- `SetRow` — set cards
- `SetCardEmbed` — artist/set detail thumbnails
- `MusicActions` — play/pause buttons
- `SearchResults` — track/set rows
- `ListeningPath` — New here? Start here
- `HistoryPlayRow` — library/history + continue listening
- `PlaylistPageContent` — playlist rows
- `EssentialSetOfDayHero` — featured set hero
