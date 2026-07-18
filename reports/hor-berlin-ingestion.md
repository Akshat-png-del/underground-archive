# HÖR Berlin Verified Ingestion Report

Generated: 2026-07-17

## Playback regression

| Check | Result |
| --- | --- |
| `npm run test:playback` (before) | **55/55 pass** |
| `npm run test:playback` (after) | **55/55 pass** |
| Playback core files modified | **None** |

## Summary

| Metric | Count |
| --- | ---: |
| Official HÖR sets in catalog (after cleanup) | **23** |
| HÖR artists with verified sets | **16** |
| HÖR sets added this session | **1** (Alarico) |
| HÖR / misattributed sets removed | **9** |
| Spotify track batches filled for HÖR artists | **12 artists** (~57 tracks) |
| Duplicate YouTube IDs avoided | — |
| Artists with missing Spotify Artist IDs (HÖR) | **0** |
| New artists created | **0** (no unverified introductions) |

## Sets added

| Artist | YouTube ID | Title |
| --- | --- | --- |
| alarico | `7BYy6g0vQLo` | Neighbourhood - Alarico \| HÖR - Mar 16 / 2022 |

Verified: official **HÖR BERLIN** channel (`UCmfF7JZv26UUKyRedViGIlw`), public, API duration ≥ 10 minutes.

## Sets removed (authenticity)

| Artist | YouTube ID | Reason |
| --- | --- | --- |
| adam-x | `MoyZRbodpWg` | Misattribution — Adam Port / Keinemusik, not Adam X |
| adam-x | `E8UMOqVtfuI` | Misattribution — Adam Beyer Boiler Room |
| adam-x | `v--0OhHHKfg` | Misattribution — Adam Beyer |
| adam-x | `lHF7lsk9mco` | Misattribution — Adam Port b2b |
| robert-natus | `skqiE_1tuwY` | Non-official channel (FR3NNIK), &lt;10 min |
| arkus-p | `skqiE_1tuwY` | Same non-official upload |
| holy-priest | `Qub-GxH0aTw` | Non-official channel (MamutWorkout) |
| dave-the-drummer | `uCYECAJn1fU` | Non-official (SUDOR), **48 seconds** |
| laven | `oaiP_FKMwvE` | Misattribution — Vick Lavender, not Laven |

Also cleared unrelated lavender/exhale false matches from `laven` expansion.

## Spotify tracks filled (HÖR artists)

| Artist | Tracks added |
| --- | ---: |
| perc | +5 |
| ancient-methods | +5 |
| phase-fatale | +5 |
| rebekah | +5 |
| parfait | +4 |
| funk-tribu | +5 |
| alarico | +5 |
| somewhen | +5 |
| stranger | +5 |
| cleric | +5 |
| ansome | +5 |
| laven | +3 (artist retained; HÖR set removed) |

Nikolina retains 2 catalog Spotify track IDs (gate: ≥1 playable). Further discography scrape can be re-run when needed.

## Current verified HÖR archive (official channel only)

| Artist | Sets | Spotify tracks (expansion) |
| --- | ---: | ---: |
| rebekah | 3 | 5 |
| boris-s | 2 | 5 |
| somewhen | 2 | 5 |
| phase-fatale | 2 | 5 |
| parfait | 2 | 4 |
| regal | 2 | 5 |
| alarico | 1 | 5 |
| ancient-methods | 1 | 5 |
| ansome | 1 | 5 |
| cleric | 1 | 5 |
| funk-tribu | 1 | 5 |
| hadone | 1 | 5 |
| nikolina | 1 | 2 |
| perc | 1 | 5 |
| stranger | 1 | 5 |
| vendex | 1 | 5 |

All **23** remaining HÖR YouTube IDs are present in `youtube-verified-durations.ts` (≥10 min).

## Images / portraits

- No placeholder portraits invented.
- HÖR artists resolve portraits via existing **Spotify `resolvedImage` / `imageUrl`** in ingested metadata (verified Spotify artist images).
- Local researched portrait files exist for a subset (e.g. adam-x, ancient-methods, ansome, perc); others use Spotify CDN hero/portrait pipeline already wired in the archive.

## Homepage / exposure

- No homepage editorial logic or exposure-budget constants changed.
- New Alarico HÖR set enters the HÖR pool naturally via `getHorBerlinSets()`; rotation + exposure budget continue to limit simultaneous major placements.

## Catalog tooling added (data only)

| Script | Purpose |
| --- | --- |
| `scripts/ingest-hor-berlin.ts` | Clean + Search-API ingest (quota-limited) |
| `scripts/ingest-hor-berlin-playlist.ts` | Channel uploads playlist ingest (**no Search quota**) |
| `scripts/reverify-hor-sets.ts` | Re-verify all HÖR-tagged sets vs official channel |

## Blockers / next step for a larger archive

YouTube **Search** quota was exhausted mid-run, so broad discovery of additional official HÖR performances (Kobosil, Sara Landry, VTSS, Amelie Lens, etc.) did not complete.

`scripts/ingest-hor-berlin-playlist.ts` is ready to pull the official channel uploads playlist and match catalog artists without Search quota. Run when approved:

```bash
npx tsx scripts/ingest-hor-berlin-playlist.ts
npx tsx scripts/build-expansion-bundle.ts
npx tsx scripts/verify-youtube-set-durations.ts
npm run test:playback
```

## Quality gates enforced

- Official HÖR BERLIN channel ID only
- Public videos only
- API duration ≥ 10 minutes
- Official HÖR branding in title (Unicode-normalized)
- Artist name must match title (misattributions removed)
- No album/playlist Spotify IDs as tracks
- No invented durations
- No playback modifications

## Display fix

`getHorBerlinSets()` now normalizes combining-diaeresis `HÖR` titles and accepts verified livestream slot titles only when venue is HÖR Berlin after channel verification.
