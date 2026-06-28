# Deep portrait research report

Generated: 2026-06-28T16:55:00.000Z

## Summary

| Metric | Count |
| --- | --- |
| Artists researched | 38 |
| HIGH confidence accepted & downloaded | 20 |
| Found but not auto-accepted (medium/low) | 4 |
| Not found | 14 |

**Storage:** Accepted portraits saved to `public/images/portraits/researched/` with metadata in `data/portrait-research/{slug}.json`.

**Note:** Several catalog `spotifyArtistId` values are incorrect (e.g. Paula Temple, Perc). Research uses verified overrides in `portrait-deep-research.ts`.

---

## Manual deep research (Tier 1)

### Paula Temple (`paula-temple`)

**Portrait found:** yes (pending HIGH — Spotify override now corrected)

| Field | Value |
| --- | --- |
| **Artist** | Paula Temple |
| **Source** | spotify-official (verified override `4iy2RFU8gIpXF5yaK0l8ZT`) |
| **Source URL** | https://open.spotify.com/artist/4iy2RFU8gIpXF5yaK0l8ZT |
| **Confidence** | **high** (official Spotify artist photo; name match) |

**Official presence verified:**
- Website: http://www.noisemanifesto.com
- Instagram: https://www.instagram.com/paulatemple
- RA: https://ra.co/dj/paulatemple
- Bandcamp: https://noisemanifesto.bandcamp.com
- Facebook: https://www.facebook.com/paulatempleofficial
- Alias: Jaguar Woman

**Medium candidates (not auto-accepted):** Facebook OG, RA OG (blocked/low title match in automated pass).

---

### Perc (`perc`)

**Portrait found:** yes (accepted)

| Field | Value |
| --- | --- |
| **Artist** | Perc (Ali Wells) |
| **Source** | resident-advisor |
| **Source URL** | https://ra.co/dj/perc |
| **Image URL** | https://static.ra.co/images/profiles/perc.jpg |
| **Confidence** | **high** |

**Official presence verified:**
- Instagram: https://www.instagram.com/perctrax
- RA: https://ra.co/dj/perc (real name: Ali Wells, UK)
- Discogs: https://www.discogs.com/artist/53980-Perc
- Bandcamp: https://perctrax.bandcamp.com
- SoundCloud: https://soundcloud.com/perc

---

### Ancient Methods (`ancient-methods`)

**Portrait found:** yes (not auto-accepted)

| Field | Value |
| --- | --- |
| **Artist** | Ancient Methods |
| **Source** | spotify-official (override `2kWRgcJHbgSEAIgewkJ1g2`) |
| **Source URL** | https://open.spotify.com/artist/2kWRgcJHbgSEAIgewkJ1g2 |
| **Confidence** | **high** (manual verification recommended — Berlin industrial techno) |

**Official presence verified:**
- Bandcamp: https://ancientmethods.bandcamp.com
- Instagram: https://www.instagram.com/ancientmethods
- RA: https://ra.co/dj/ancientmethods
- Discogs: https://www.discogs.com/artist/Ancient+Methods

**Reason not auto-accepted in first pass:** RA returned low title match; Spotify override applied after catalog ID correction.

---

### Surgeon (`surgeon`)

**Portrait found:** yes (not auto-accepted)

| Field | Value |
| --- | --- |
| **Artist** | Surgeon (Anthony Child) |
| **Source** | spotify-official (override `1PSylklb2w06BAAHEtepqM`) |
| **Source URL** | https://open.spotify.com/artist/1PSylklb2w06BAAHEtepqM |
| **Confidence** | **high** |

**Official presence verified:**
- Website: https://www.counterbalance.co.uk
- RA: https://ra.co/dj/surgeon
- Bandcamp: https://surgeon.bandcamp.com
- Discogs: https://www.discogs.com/artist/Surgeon

---

### Adam X (`adam-x`)

**Portrait found:** yes (accepted)

| Field | Value |
| --- | --- |
| **Artist** | Adam X |
| **Source** | resident-advisor |
| **Source URL** | https://ra.co/dj/adamx |
| **Confidence** | **high** |

**Official presence verified:**
- Website: https://www.adamx.net / https://www.traag.com
- Instagram: @adamx_sonicgroove (per official site)
- RA: https://ra.co/dj/adamx
- Bandcamp: https://adamx.bandcamp.com
- Label: Sonic Groove

---

### Sven Wittekind (`sven-wittekind`)

**Portrait found:** yes (not auto-accepted)

| Field | Value |
| --- | --- |
| **Artist** | Sven Wittekind |
| **Source** | spotify-official (override `1Xoao0EbCROD5MzC3iyyAD`) |
| **Source URL** | https://open.spotify.com/artist/1Xoao0EbCROD5MzC3iyyAD |
| **Confidence** | **high** (verified Spotify artist account) |

**Official presence verified:**
- Instagram: https://www.instagram.com/svenwittekind
- Facebook: https://www.facebook.com/svenwittekind
- RA: https://ra.co/dj/svenwittekind
- Beatport: https://www.beatport.com/artist/sven-wittekind/6986

**Medium candidate:** Facebook OG (label page imagery — not auto-accepted).

---

## Genre-fallback artists — HIGH confidence accepted

| Artist | Source | Source URL | Confidence |
| --- | --- | --- | --- |
| assemblage-23 | spotify-official | https://open.spotify.com/artist/7pwThElmrxl0pjTwXMojCx | high |
| she-past-away | spotify-official | https://open.spotify.com/artist/6paE8ghTau4qwwNzVRSgjR | high |
| lebanon-hanover | spotify-official | https://open.spotify.com/artist/6w8h2uD28BEdg7bX4k3Lh7 | high |
| drab-majesty | spotify-official | https://open.spotify.com/artist/2CSEKlTT9empsZ8vZWsrKO | high |
| the-soft-moon | spotify-official | https://open.spotify.com/artist/40HeNm05FEAxGx8gUOV4my | high |
| rrose | spotify-official | https://open.spotify.com/artist/5naKaYAyzzuPDsh4H2dwyT | high |
| blawan | spotify-official | https://open.spotify.com/artist/64kN9EkSTHYhda2FupL0KI | high |
| ph87 | spotify-official | https://open.spotify.com/artist/6w8j7obDDze1ovIL3lXGZf | high |
| part-time-killer | spotify-official | https://open.spotify.com/artist/1PDjdSn9YCXz1reA1PUcC0 | high |
| lucy | spotify-official | https://open.spotify.com/artist/0BlPI3UKzTcN2jf0gCa0b9 | high |
| victor-ruiz | spotify-official | https://open.spotify.com/artist/0xgdNNa5mIbnJKp8AG8S4z | high |
| josh-wink | spotify-official | https://open.spotify.com/artist/6DQLkRykAsF6paJnlIMX4H | high |
| dave-the-drummer | spotify-official | https://open.spotify.com/artist/4ulxN8QnUlk3bX6IopQO7C | high |
| paranoid-london | spotify-official | https://open.spotify.com/artist/0KyUH5WmspOhuIQAnw42Fb | high |
| randomer | spotify-official | https://open.spotify.com/artist/7K0WJzyqUNRhraNcsvJp1h | high |
| front-242 | spotify-official | https://open.spotify.com/artist/2tyMOS8xKREgpEwHnLc6EX | high |
| norbak | spotify-official | https://open.spotify.com/artist/0TwXWZcwzGVVOa1Vdu3UEj | high |
| mcr-t | spotify-official | https://open.spotify.com/artist/4m7q9onIm2bqhwHy9utqmw | high |

---

## Not found — requires further manual research

| Artist | Reason |
| --- | --- |
| psyk32 | No Spotify ID; Discogs/RA blocked or no match; no official links in catalog |
| petduo | No verified Spotify ID; enrichment API quota errors |
| hante | No external presence in ingestion; Discogs 403 |
| rumina | No verified profiles found |
| per-sona | No verified profiles found |
| debora-alessio | No Spotify ID in catalog; no Discogs match |
| ansome | No Spotify ID; no official profile discovered |
| hector-oaks | Name disambiguation risk; no verified Spotify ID |
| len-d | No verified profiles found |
| alex-bau | No verified profiles found |
| weichentechnikk | No verified profiles found |
| petra-flurr | YouTube API quota error; no fallback source |
| deepbass | No Spotify ID; ambiguous name |
| lft | No verified profiles found |

---

## Pipeline

- Script: `scripts/research-portraits.ts`
- Library: `src/lib/ingestion/portrait-deep-research.ts`
- Re-run: `npx tsx scripts/research-portraits.ts`

**Next steps:** Wire accepted portraits into `verified.ts` or ingestion bundle after manual identity check; fix incorrect `spotifyArtistId` values in `catalog.ts` for Tier 1 artists.
