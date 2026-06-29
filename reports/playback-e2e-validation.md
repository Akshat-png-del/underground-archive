# Playback E2E Validation Report

Generated: 2026-06-28T21:38:03.324Z
Base URL: http://localhost:3000

## Summary

| Metric | Value |
|--------|------:|
| Automated E2E checks | 21 |
| E2E passed | 21 |
| E2E failed | 0 |
| Catalog entities without playable source | 705 |
| **Overall validation** | **FAIL** |

## Catalog playback failures (data layer)

These items route through the global player but **cannot produce audio** — missing Spotify/YouTube/preview URL.

| Entity | Missing source | Total | % |
|--------|---------------:|------:|--:|
| catalog-tracks (missing source URL) | 545 | 781 | 70% |
| catalog-releases (missing source URL) | 160 | 301 | 53% |

## Untested / partial coverage

| Item | Status |
|------|--------|
| Homepage "Recommended tracks" (`HomeRetentionSections`) | **Not mounted** on `/` — tested via `/genres/hard-techno` essential tracks instead |
| Real OS tab / app backgrounding | **Simulated only** (`visibilitychange`, `pagehide`) |
| Audible output in headless browser | **Not verified** — DOM/embed state only |
| Full page reload during playback | Resets client store (expected); client-side nav tested |

## E2E results (playable items)

| Surface | Scenario | Result | Detail |
|---------|----------|--------|--------|
| homepage-tracks | play | PASS | Global player visible, embed loaded, pause control shown |
| homepage-tracks | pause | PASS | Paused; embed blank=true |
| homepage-tracks | resume | PASS | Resumed; embed active=true |
| homepage-tracks | route-change | PASS | Player persisted via client nav; track="TITS, LIPS, HIPS, KISS (10/10 Remix)" |
| homepage-tracks | tab-visibility-simulated | PASS | Player visible after visibilitychange; embed=active |
| homepage-tracks | app-switch-simulated | PASS | Player survived pagehide/pageshow |
| homepage-sets | play | PASS | Essential set hero play OK |
| homepage-sets | pause | PASS | Paused; embed blank=true |
| homepage-sets | resume | PASS | Resumed; embed active=true |
| artist-page-tracks | play | PASS | Global player visible, embed loaded, pause control shown |
| artist-page-tracks | pause | PASS | Paused; embed blank=true |
| artist-page-tracks | resume | PASS | Resumed; embed active=true |
| search-tracks | play | PASS | Search result play OK |
| search-tracks | pause | PASS | Paused; embed blank=true |
| search-tracks | resume | PASS | Resumed; embed active=true |
| recommended-tracks | play | PASS | Global player visible, embed loaded, pause control shown |
| sets-directory | play | PASS | Global player visible, embed loaded, pause control shown |
| artist-page-sets | play | PASS | Artist set card play OK |
| artist-page-sets | pause | PASS | Paused; embed blank=true |
| artist-page-sets | resume | PASS | Resumed; embed active=true |
| homepage | rapid-switch | PASS | After rapid clicks: player=true embed active |

## Stress test

Run separately: `npm run stress:playback` (generation-token rapid switch, pause/resume, stop).

## Verdict

**VALIDATION INCOMPLETE.**

- Interaction layer (play/pause/resume/nav/rapid switch): **PASS** for playable catalog items.
- Catalog data: **705 entities** cannot play until URLs are enriched.
