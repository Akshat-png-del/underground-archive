# Playback Stability Audit

Generated: 2026-07-19T00:37:31.220Z
Mode: offline resolution only

## Summary

| Category | Total | Working | Broken |
|----------|------:|--------:|-------:|
| Tracks | 564 | 564 | 0 |
| Sets | 456 | 456 | 0 |

## Working tracks

564 tracks have a resolvable playback source.

## Broken tracks

None.

## Working sets

456 sets have valid YouTube IDs.

## Broken sets

None — all archive sets resolve to YouTube embeds.

## Notes

- **Broken tracks** with "missing URL" need Spotify/YouTube metadata in catalog expansion — not playback engine fixes.
- Run `npm run audit:playback-full -- --live` before releases to catch deleted embeds.
- Blocked IDs (live failures) are written to `data/playback-blocklist.json` with `--apply-blocklist`.
