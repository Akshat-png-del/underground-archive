# Track Source Resolution Fix

## Trace: I Hate Models → Intergalactic Emotional Breakdown

### 1. Incoming track object

```json
{
  "id": "i-hate-models::intergalactic-emotional-breakdown",
  "title": "Intergalactic Emotional Breakdown",
  "artist": "I Hate Models",
  "artistSlug": "i-hate-models",
  "artistId": "i-hate-models",
  "verified": true,
  "duration": "10:10",
  "releaseYear": 2019,
  "coverArt": "https://i.scdn.co/image/ab67616d00001e0266ba933a216383e5f943289a",
  "spotifyUrl": "https://open.spotify.com/track/5dHDxDXEMaRjmf0wHZLBmy",
  "soundcloudUrl": "https://soundcloud.com/i-hate-models"
}
```

### 2. Normalized sources

```json
{
  "spotifyUrl": "https://open.spotify.com/track/5dHDxDXEMaRjmf0wHZLBmy",
  "spotifyTrackId": "5dHDxDXEMaRjmf0wHZLBmy"
}
```

### 3. PlaybackItem built

```json
{
  "type": "track",
  "refId": "i-hate-models::intergalactic-emotional-breakdown",
  "label": "Intergalactic Emotional Breakdown — I Hate Models",
  "title": "Intergalactic Emotional Breakdown",
  "subtitle": "I Hate Models",
  "coverArt": "https://i.scdn.co/image/ab67616d00001e0266ba933a216383e5f943289a",
  "spotifyUrl": "https://open.spotify.com/track/5dHDxDXEMaRjmf0wHZLBmy",
  "spotifyTrackId": "5dHDxDXEMaRjmf0wHZLBmy",
  "detailsHref": "/artists/i-hate-models#track-i-hate-models::intergalactic-emotional-breakdown"
}
```

### 4. Resolved source

| Field | Value |
|-------|-------|
| kind | spotify |
| sourceUrl | https://open.spotify.com/track/5dHDxDXEMaRjmf0wHZLBmy |
| embedUrl | https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1 |
| issue | null |

**Result:** PASS — Spotify track embed with autoplay

## Catalog coverage

| Metric | Count |
|--------|------:|
| Total catalog tracks | 781 |
| Playable after fix | 236 |
| Empty spotifyUrl in catalog | 545 |
| Tracks with resolved Spotify track ID | 210 |

## Root cause

1. **Field name mismatch** — resolver only read `item.spotifyUrl`; data often stores `spotifyTrackId`, `trackId`, or nested `external.spotify` / `spotify.id`.
2. **Empty string vs missing** — `toCatalogTrack` coerced missing URLs to `""`, which is falsy and skipped resolution without catalog re-lookup.
3. **No catalog enrichment** — persisted or UI-built `PlaybackItem` objects could reach the engine without re-merging canonical catalog URLs.

## Fix (source resolution only)

- Added `src/lib/music/track-source.ts` — normalizes `spotifyUrl`, `spotifyTrackId`, `youtubeUrl`, `previewUrl` from all known field names.
- Updated `playback-source.ts` — enriches track items from catalog by `refId` before resolving; resolves `spotifyTrackId` → track URL; logs `[TRACK CLICK]`, `[SOURCE RESOLUTION]`, `[FINAL SOURCE]`.
- Updated `playback.ts` — `playbackItemFromTrack` / `playbackItemFromMusicActions` emit normalized sources with `spotifyTrackId`.
- Updated `content/tracks/index.ts` — `catalogSpotifyUrl()` derives URL from `spotifyTrackId` at catalog build time.

**Not modified:** playback engine, global player, UI, switching logic.

## Sample still-unplayable tracks (no metadata in catalog)

- `azyr::azyr` — Azyr (no Spotify/YouTube/preview after enrichment)
- `azyr::warehouse-pressure` — Warehouse Pressure (no Spotify/YouTube/preview after enrichment)
- `azyr::peak-hour` — Peak Hour (no Spotify/YouTube/preview after enrichment)
- `azyr::distorted-dreams` — Distorted Dreams (no Spotify/YouTube/preview after enrichment)
- `azyr::night-shift` — Night Shift (no Spotify/YouTube/preview after enrichment)
- `mrd::mrd` — MRD (no Spotify/YouTube/preview after enrichment)
- `mrd::warehouse-pressure` — Warehouse Pressure (no Spotify/YouTube/preview after enrichment)
- `mrd::peak-hour` — Peak Hour (no Spotify/YouTube/preview after enrichment)

## Failure line reference

When resolution fails, console logs include:

`[SOURCE RESOLUTION] failure at playback-source.ts:track missing spotifyUrl/spotifyTrackId/youtubeUrl/previewUrl`

For IHM this line is **not** reached — resolution succeeds at `playback-source.ts` Spotify track embed branch.
