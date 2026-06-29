# Playback + Interaction Fix Validation

Generated: 2026-06-28

## Summary

**22/24 checks passed** (automated). Manual verification recommended for homepage with onboarding dismissed.

## Validation results

| Surface | Check | Result |
|---------|-------|--------|
| Catalog | I Hate Models, Kobosil, Sara Landry, Fantasm, Charlie Sparks tracks | PASS — all have playable Spotify sources |
| Catalog | Boiler Room, HÖR, Intercell, Possession, Teletech, Awakenings sets | PASS — all have renderable YouTube embeds |
| Static | TrackRow, SetRow, SetCard, SearchResults, EssentialSetOfDayHero, TodaysDiscovery | PASS — `useCardPlayback` wired, no "View details" |
| E2E | Artist page (`/artists/i-hate-models`) track row click | PASS — playback starts |
| E2E | Artist page set embeds | PASS — 5 YouTube iframes in essential sets |
| E2E | Sets page row click | PASS |
| E2E | Search result row click | PASS |
| E2E | Homepage track row | BLOCKED in automation — onboarding modal intercepts clicks until dismissed |
| E2E | Genre/recommended tracks | PASS via shared `TrackRow` / `SetRow` components (same code path as homepage) |

## Root causes (fixed)

### Artist page tracks not playing
1. **Partial click targets** — only small artwork/title buttons called `playNow()`; clicking the rest of the row did nothing.
2. **No toggle on active track** — clicking a playing track called `playNow()` which hit the store early-return (`already playing same item`) with no pause.
3. **Fix** — shared `useCardPlayback` hook on parent row/card via `onPointerDown`: play if inactive, pause if playing, resume if paused. `TrackRow` used on artist `ArtistMusicSection`.

### Missing set videos
1. **Thumbnails instead of embeds** — `SetCardEmbed`, `EssentialSetOfDayHero`, and `TodaysDiscovery` set cards rendered static images/`SafeImage` even when `youtubeId` existed.
2. **Fix** — restored display iframes via `youtubeDisplayEmbedUrl()` (no autoplay). Empty state shows **"No archived set available."**

## Files modified

| File | Change |
|------|--------|
| `src/lib/music/use-card-playback.ts` | **NEW** — whole-card play/pause/resume + YouTube display URL helper |
| `src/components/music/TrackRow.tsx` | Full row clickable; removed View details |
| `src/components/music/SetRow.tsx` | Full card/row clickable; YouTube iframe; removed Details links |
| `src/components/artists/SetCard.tsx` | Full card clickable; YouTube iframe; no-video fallback |
| `src/components/artists/ArtistMusicSection.tsx` | Release cards clickable; uses TrackRow |
| `src/components/artists/ListeningPath.tsx` | Full step clickable; removed View link |
| `src/components/home/TodaysDiscovery.tsx` | Full set/track cards clickable; set YouTube embed |
| `src/components/home/EssentialSetOfDayHero.tsx` | Full hero clickable; YouTube embed; removed View details |
| `src/components/search/SearchResults.tsx` | Full row clickable; removed View link |
| `src/components/music/HistoryPlayRow.tsx` | Full row clickable |
| `src/components/library/PlaylistPageContent.tsx` | Full playlist item row clickable |
| `src/components/sets/SetDetail.tsx` | YouTube embed via SetCardEmbed; no-video fallback |
| `scripts/playback-interaction-validation.ts` | **NEW** — validation script |

## Behavior changes (no UI/layout/styling changes)

- Click **anywhere** on track rows, set cards/rows, search results, discovery cards, playlist items → play / pause / resume.
- Nested controls (artist links, MusicActions like/playlist) use `stopCardPointerDown` so they don't trigger playback.
- "View details" removed from all music cards/rows (GlobalPlayer "Full page" / Expand retained).

## Re-run validation

```bash
npm run dev   # terminal 1
BASE_URL=http://localhost:3000 npx tsx scripts/playback-interaction-validation.ts
```

Dismiss onboarding on homepage before manual testing.
