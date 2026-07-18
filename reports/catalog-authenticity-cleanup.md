# Catalog Authenticity Cleanup — Media-First Archive

Date: 2026-07-13

## Summary

| Metric | Before | After | Removed |
|--------|-------:|------:|--------:|
| Artists | 150 | **67** | **83** |
| Tracks | 236 | **209** | **27** |
| Sets | 241 | **193** | **48** |
| Releases | 85 | **0** | **85** |

## Quality gates (post-cleanup)

- Artists without verified media: **0**
- Tracks without valid Spotify track URL: **0**
- Stub placeholder titles remaining: **0**
- Sets without verified YouTube duration: **0**
- Sets under 10 minutes: **0** (46 removed via YouTube Data API)
- Hardcoded/invented durations: **0**
- Dangling collection/tier/similarArtists slugs: **0**
- Playback tests: **54/54 pass**

## Mechanisms

1. `scripts/verify-youtube-set-durations.ts` — fetches real durations via YouTube Data API
2. `src/lib/catalog/youtube-verified-durations.ts` — verified duration registry (187 IDs ≥10 min)
3. `src/lib/catalog/apply-authenticity.ts` — media-first gate (tracks + verified long sets)
4. `src/content/artists/authenticity-removals.ts` — 83 excluded slugs for seed filtering

## Artists removed (83)

alex-bau, amelior, ash-code, assemblage-23, basswell, ben-spencer, berkan, berlyn, bianca-obyn, blasha-allatt, blicz, chlar, clouds, cltx, cravet, crystal-distortion, dave-the-drummer, daxson, debora-alessio, deepbass, drab-majesty, eric-sneo, francois-x, frank-nitzinsky, front-242, front-line-assembly, ha-cay, hante, hardfloor, hausman, hector-oaks, hemka, hiccup, ignacio, igor-r, iochan, jacidorex, kaiser, klaps, klonne, krow, lars-huismann, leather-strip, lebanon-hanover, lft, linea-aspera, lsdxoxo, matrakk, mcmlxxxv, mcr-t, moia, nitzer-ebb, norbak, novah, ogian, ogive, part-time-killer, per-sona, petra-flurr, ph87, phuture-corp, pinion, psyk32, pulsar, randall, raw-distort, raxyor, rosati, rumina, she-past-away, spd, spektre, tafkamp, temo, the-soft-moon, vil, vilchezz, vklf, vrtx, warface, weichentechnikk, yanamaste, yant

Criteria: no verified playable Spotify track AND no verified YouTube set ≥10 minutes after API duration check.

## Sets removed (48)

| Artist | YouTube ID | Title |
|--------|------------|-------|
| sara-landry | 0m_RS2Y2S6A | Verknipt Events |
| sara-landry | 61TtukNICZU | Verknipt Arena |
| sara-landry | 8lE59Shdod0 | Time Warp NYC |
| i-hate-models | 3Xb2gnAZMb8 | Glitch Festival — Possession 2022 |
| i-hate-models | rkX34tlAKXg | I Hate Models at Boiler Room: Montréal |
| i-hate-models | IfU_CCY03XA | I Hate Models at Boiler Room: London |
| kobosil | 28--TqRW_K8 | Kobosil play at Intercell, Ade |
| kobosil | HMsarxyA64c | Kobosil @ Awakenings 2024 CRAZY VISUALS |
| kobosil | U9LSmLTVUxk | Kobosil at Awakenings Festival |
| vtss | TU1ZYyXuRdE | VTSS Boiler Room set @ Dekmantel Festival |
| vtss | cfJLi4bxpao | VTSS at Dekmantel Netherlands, Boiler Room 2022 |
| regal | ToOFNT1DvGc | Regal \| Boiler Room Tbilisi |
| boy-harsher | DxwJMtM5m8Q | Give Me a Reason (Lyrics) Music Video |
| sven-wittekind | 7bmuTxNAAPk | Awakenings Festival '08 |
| robert-natus | skqiE_1tuwY | Robert Natus & Arkus P. - Hörtest (1) |
| robert-natus | igilseYYdyQ | Triple Religion LIVE @ Awakenings 2012 |
| robert-natus | nucJABinbgA | Triple Religion LIVE @ Awakenings (duplicate) |
| arkus-p | skqiE_1tuwY | Robert Natus & Arkus P. - Hörtest (1) |
| arkus-p | igilseYYdyQ | Triple Religion LIVE @ Awakenings 2012 |
| arkus-p | ucW9AcfbaIM | Hardcore Salsa (Timewarp remix) |
| boris-s | OgRPJNY-aWo | Boris Kleine im Exhale Hardcore Gym |
| paula-temple | Tqn_S1Sz8s0 | b2b SNTS at Intercell ADE 2019 |
| ghost-in-the-machine | usKUkBlJ2Lc | Ghost In The Machine 7/5 Boiler Room |
| ghost-in-the-machine | mHWzbacL3AU | Intercell x Paula Temple ADE 2019 Closing |
| ghost-in-the-machine | 85EDVE9Dih0 | Intercell ADE x Perc Trax |
| codex-empire | 4yVh-K3pgWY | Codex Empire Live @Possession 21.10.17 |
| orphx | KiiFwmuMErw | Orphx - Possession |
| orphx | W_C2OzblMSE | Orphx - Possession [SG1039] (2010) |
| laven | 3cPMW1OMM5o | Lavender peace video (wrong content) |
| laven | 0vc_upMFBg0 | Lavender Exhale |
| trym | cIb4oh9VruI | Trym at Boiler room |
| trym | yC9TjuqKbxo | Trym at Teletech, Boiler Room 2022 |
| trym | 3mQXAoISRYU | TRYM dropping Golden Raver clip |
| trym | pzCK1nWaO6g | TRYM DIET COKE vocal clip |
| parfait | e1Sb0lVTMb8 | Parfait • Boiler Room x Possession Paris 2019 |
| nikolina | m_H0u8eCJow | Nikolina at Boiler Room x Teletech: London |
| nikolina | CLfqWu7Aics | Nikolina play at Teletech |
| fantasm | -r1jD4jnhA0 | Unreal Germany |
| alignment | isGJmL1QxiE | Alignment at Boiler Room: Lyon |
| alignment | DyVAL06G4SE | Alignment \| Boiler room #ElPartynotermina |
| rikhter | UEeWqeYdGRI | Rikhter at Boiler Room |
| stranger | X27CfESc6DY | Stranger Things meme (wrong content) |
| spektre | lvjAQT07-hg | Max Cooper Spektre remix (wrong artist) |
| front-line-assembly | _j03N4im1T0 | Front Line Assembly - Exhale (track, not set) |
| josh-wink | IbfpjyhL7j4 | Josh Wink @ Awakenings Easter 2011 |
| dave-the-drummer | uCYECAJn1fU | Dave The Drummer Hor Berlin clip |
| alex-bau | oU-6IORR5Cc | Alex Bau - Awakenings Eindhoven 2011 |
| alex-bau | oHj0bAFw94Q | Alex Bau @ Awakenings 2011 |

All removed because YouTube Data API verified duration **< 10 minutes** (or video unavailable).

## Tracks removed (27)

Removed invalid Spotify URLs, stub placeholder titles, and artist-name-as-track entries during `sanitizeArtistMedia`. No replacement tracks generated.

## Releases removed (85 → 0)

All releases lacked verified Spotify album/track URLs. Auto-generated EP/single fabrication remains disabled in builder.

## Placeholder patterns removed

Warehouse Pressure, Peak Hour, Distorted Dreams, Night Shift, Raw Energy, Factory Floor, Steel Rhythm, Dark Matter, Machine Soul, Void, Cold Pulse, Body Control, Neon Decay, Ashes, Midnight Drive, Live Session, Essential Mix, Warehouse, artist-name-as-track-title, album/artist Spotify URLs used as tracks.

## Orphan references repaired

| Location | Slugs removed |
|----------|---------------|
| `collections.ts` | front-line-assembly, nitzer-ebb, daxson, spd, debora-alessio |
| `tiers.ts` | 28 tier-2 slugs matching removed artists |
| `similarArtists` | auto-filtered by `applyAuthenticityCleanup` |

## Playback

No playback engine, provider, store, hook, transport UI, or playback-related React components were modified.

Regenerate YouTube durations: `npx tsx scripts/verify-youtube-set-durations.ts`
