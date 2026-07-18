# HÖR Berlin Verified Archive — Audit Report

Generated: 2026-07-17

## Summary

| Metric | Count |
| --- | ---: |
| Official HÖR uploads listed (channel uploads playlist) | 9,851 |
| Eligible long-form official sets (≥10 min, public, HÖR channel) | 9,499 |
| Cached eligible set file | `.tmp/hor-eligible-sets.json` |
| **HÖR artists in catalog (after this pass)** | **44** |
| **HÖR sets attached & duration-verified** | **123** |
| Sets newly attached this session (catalog match) | 47 |
| Mismatched HÖR attributions removed | 28 |
| Artists created (new) | 0 |
| Artists reintroduced | 0 |
| Unmatched branded artists queued for Spotify resolve | 4,677 |
| Playback files touched | **0** |

## Source of truth

- Channel: `UCmfF7JZv26UUKyRedViGIlw` (HÖR BERLIN)
- Uploads playlist: `UUmfF7JZv26UUKyRedViGIlw`
- Method: playlistItems walk + videos.list duration/channel verification
- **Not** YouTube Search

## What was fixed

1. **False attributions removed (28)** — loose name matching had attached wrong sets (e.g. WAN→Blawan, KLOUD→Cloudy, Nota≠NOVAH, LEGA≠Regal, ÆNN≠Lee Ann Roberts). See `.tmp/hor-mismatch-removals.json`.
2. **Strict matching** — exact fold / trailing-digit alias / trailing single-letter initial only; optional whole-name token in title.
3. **Catalog-first ingest** — Phase 1 attaches only to existing catalog artists; Phase 2 creates new artists only after Spotify + MusicBrainz gates.
4. **All 123 retained HÖR sets** pass YouTube API duration ≥ 10 minutes.

## Verification failures / skips

### Spotify new-artist gate (Phase 2)

Spotify Web API returned **HTTP 429 Too Many Requests** for the entire Phase 2 window after an earlier aggressive search pass. New internationally recognized guests (Iron Curtis, Marcel Fengler, Jennifer Touch, Apolonia, …) could not be verified or created without inventing IDs.

- Queue persisted: `.tmp/hor-unmatched-queue.json` (4,677 unique branded names, sorted by set count)
- Resume: wait for Spotify quota recovery, then:

```bash
HOR_NEW_ARTIST_LIMIT=50 npx tsx scripts/ingest-hor-berlin-archive.ts
```

(Uses eligible cache; processes unmatched branded titles highest-frequency first.)

### Typical skip reasons (when Spotify was reachable earlier)

- Insufficient Spotify presence (followers/popularity gate)
- Spotify name mismatch (search result ≠ HÖR title artist)
- Livestream-slot titles without catalog match (no new-artist create)
- Missing MusicBrainz country (for new artists only)

## Duplicate removals

- Duplicate YouTube IDs already owned by another artist: skipped at attach time
- Re-runs skip sets already present on the matched artist expansion

## Playback

| Check | Result |
| --- | --- |
| MediaSession / GlobalPlayerEngine / providers / store / bottom player | **untouched** |
| Playback tests | run separately (`npm run test:playback`) |

## Scripts added/used (catalog only)

- `scripts/ingest-hor-berlin-archive.ts` — full archive walk + attach
- `scripts/cleanup-hor-mismatches.ts` — remove false HÖR attributions
- `scripts/build-hor-unmatched-queue.ts` — queue for Spotify resume
- `scripts/audit-hor-durations.ts` — drop sets under 10 minutes
- `scripts/verify-youtube-set-durations.ts` — regenerate duration registry

## Next steps (Curation Mode)

1. Wait for Spotify rate-limit reset.
2. Resume Phase 2 from `.tmp/hor-unmatched-queue.json` / archive script (top of queue first).
3. For each verified new artist: Spotify ID + ≥3 top tracks + portrait + MusicBrainz country + official HÖR set(s).
4. Re-run `npm run expand:bundle` + `npx tsx scripts/verify-youtube-set-durations.ts`.
5. Prefer authenticity over filling all 4,677 names — skip anyone who fails gates.
