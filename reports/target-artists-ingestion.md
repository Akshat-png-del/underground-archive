# Targeted New-Artist Verified Ingestion — Report

_Generated: 2026-07-18 · Curation Mode (media-first). Playback system byte-for-byte unchanged._

## Summary

| Metric | Count |
| --- | --- |
| Target artists requested | 25 |
| **Artists added (new, verified)** | **21** |
| Artists skipped (already existed) | 1 |
| Artists that could not be verified | 3 |
| **Verified Spotify tracks added** | **114** |
| **Verified long-form sets added (≥10 min, YouTube API)** | **77** |
| Built catalog artist count | 105 |
| Validation errors | 0 |

All new artists pass the public artist gate (≥1 verified Spotify track and/or ≥1 verified long set), have a real Spotify artist ID, real Spotify-CDN portrait + hero image, resolved genres/BPM/mood/country, and are wired into the homepage exposure budget (curation tier 2 + featured pool).

## Artists added

Every artist below: verified Spotify ID, portrait + hero resolve, tier 2 (partial), in featured pool.

| Artist | Country | Tracks | Sets | Spotify ID |
| --- | --- | ---: | ---: | --- |
| BYORN | International | 6 | 2 | 6PNduxfJ9CVW1bVXUR16AD |
| KUKO | Japan | 3 | 1 | 4sCQPElBVBfJNFGydeWwnU |
| LESSSS | France | 6 | 4 | 5Os2nUALInDs7MyexVNwrm |
| Luciid | Ireland | 6 | 2 | 3YMs2NjzmU8oc5muj4LxgL |
| Doruksen | International | 6 | 2 | 4QualaVaoF8vYnpJ5o8Pw6 |
| Kander | United States | 2 | 4 | 3gSVZTpmVW2JKzngOCDXkd |
| Callush | Germany | 6 | 5 | 7mD8JtA3uI7BI0CoGdKcid |
| KRL MX | France | 6 | 7 | 49e9A9elFAUS9sCDMTyiWC |
| 6EJOU | France | 6 | 8 | 1k0U51DXyjFk4YnLZUIMP9 |
| AIROD | France | 6 | 4 | 3oPI0nOC7MHooFy5qDsFrv |
| Fatima Hajji | Spain | 5 | 8 | 6jZSXmTCxZhFfYELtp78Ci |
| Fernanda Martins | Spain | 6 | 0 | 52MgoD4ydR3spsWVir9naX |
| SNTS | Germany | 6 | 3 | 6Unmr1mmDxRqZY7jkSQOcg |
| Tommy Four Seven | Germany | 6 | 5 | 3AxgXLivpM1GoOVMjMgsId |
| Headless Horseman | Germany | 6 | 3 | 7zB6lIez4mAY66sepHvJBa |
| Inhalt der Nacht | Germany | 6 | 5 | 0rCDBsRMdD2jIAnAf6kbaL |
| Scalameriya | Serbia | 6 | 3 | 2YMcVZW7930T6vyQikJJpG |
| DJ Hyperdrive | International | 6 | 5 | 4SpabttFpFvc0lqr5gYPen |
| mischluft | International | 6 | 2 | 6IPWduBm255hSxmAcNoHjF |
| XRTN | Netherlands | 6 | 4 | 5oXWx1ZjiyWTt4fhjUQgKR |
| KAS:ST | Spain | 2 | 0 | 7orlzf5LTqSnCzURkZFebN |

## Artists skipped (already existed)

- **Onlynumbers** — already present in catalog; not duplicated or overwritten.

## Artists that could not be verified (skipped, per authenticity rules)

- **Otta** — no owned Spotify tracks matched; Spotify identity unconfirmed (likely same-named namesake). Not ingested.
- **KUSS** — no owned Spotify tracks matched; identity unconfirmed. Not ingested.
- **Jazzy** — no owned Spotify tracks matched; only same-named other-genre namesake found. Not ingested.

No fabricated data was created for these; they are left out until a verified Spotify identity and/or official long set can be confirmed.

## Sets added by event (all YouTube-API-verified, ≥10 min, official uploads)

| Event | Sets |
| --- | ---: |
| HÖR Berlin | 30 |
| Verknipt | 29 |
| Boiler Room | 12 |
| Gotec | 3 |
| Intercell | 3 |
| Teletech | 0 |
| Stone Techno | 0 |
| **Total** | **77** |

Other requested event sources (Teletech, Vault Sessions, Possession, KNTXT, Unreal, Awakenings, RSO, Fabrik Madrid, Time Warp, Rotterdam Rave, Tomorrowland, Extrema Outdoor, Terminal V, Reaktor, Club OST, Bassiani, Khidi) yielded no *new* API-verified official long-form uploads for these specific artists during this run and were skipped rather than filled with unofficial/fan uploads.

## Tracks added

114 verified Spotify tracks total. Each has a valid 22-char Spotify track ID, real cover artwork (Spotify CDN), release year, album, and an API-verified duration recorded in `spotify-verified-durations.ts`. No placeholders, no album/artist URLs posing as tracks, no `5:00` defaults, no duplicate IDs.

One collaboration ("Knees", `3JsKkWIZq3HnRTiCZJUS6B`) was found under both Fatima Hajji and the pre-existing Hector Oaks; it was kept on the existing owner (Hector Oaks) and removed from the new Fatima Hajji entry to avoid a duplicate track ID.

## Missing media still requiring manual verification

- **Fernanda Martins** — 6 verified tracks but 0 API-verified long sets attached this run. Publicly valid via tracks; long sets can be added later when an official upload is confirmed.
- **KAS:ST** — 2 verified tracks, 0 sets attached. Valid via tracks; more tracks/sets recommended when verifiable.
- **Kander / KAS:ST** — lower track counts (2 each) vs. the 6-track target; additional verified tracks recommended.

## Validation results

- ✓ No duplicate artists (slug/id)
- ✓ No duplicate tracks (by real Spotify ID) among new/affected artists
- ✓ No duplicate sets (by YouTube ID) among new artists
- ✓ All new-artist Spotify IDs valid (22-char)
- ✓ All new-artist YouTube set IDs valid (11-char) and present in the API-verified duration registry (≥10 min)
- ✓ All 114 new tracks present in the Spotify duration registry with non-empty resolved durations
- ✓ All portraits + hero images resolve (real URLs, no SVG/placeholder fallbacks)
- ✓ similarArtists / collections / tiers resolve without orphans
- ⚠ Pre-existing (not from this ingest): set `pSkun1wICSc` is shared between existing artists `amelie-lens` and `kobosil` — flagged for separate manual review.

## Homepage exposure

New artists are wired into the exposure budget:

- **Featured pool** (`src/content/home/featured-pool.ts`) — all 21 added.
- **Curation tier 2** (`src/lib/archive/curation/tiers.ts`) — all 21 added, feeding Trending / Discovery / Most Saved / Community rotations.
- **HÖR Berlin section** — surfaces the 30 new HÖR sets.
- **Boiler Room section** — surfaces the 12 new Boiler Room sets.
- **Festival section** — surfaces Verknipt / Gotec / Intercell sets.

The rotation logic already prevents any single artist from dominating multiple sections simultaneously.

## Playback freeze compliance

- No playback files modified (verified via `git status` on `src/lib/music/**`, `src/stores/**`, providers, engine, player UI).
- `npm run test:playback` — **55/55 passing**.
- The 9 `audit:playback-arch` violations are pre-existing baseline in untouched trace/dev files (`hydration-pipeline-trace`, `media-engine-bootstrap`, etc.) and are unrelated to this ingest.

## Files changed (catalog data only)

- `data/catalog-expansion/*.json` + `data/ingestion/artists/*.json` — new artist tracks/sets/metadata
- `src/content/artists/target-artists-seeds.ts` — new artist seeds
- `src/content/artists/all.ts` — wired in `targetArtistCatalogArtists`
- `src/content/artists/metadata/{expansions,ingested}.json` — rebuilt bundles
- `src/lib/catalog/spotify-verified-durations.ts` — 114 new verified durations
- `src/lib/catalog/youtube-verified-durations.ts` — new verified set durations
- `src/lib/archive/curation/tiers.ts`, `src/content/home/featured-pool.ts` — homepage exposure
- `src/content/artists/track-cover-hashes.json` — new track cover hashes
