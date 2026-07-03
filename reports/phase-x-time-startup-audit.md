# Phase X — Time Display + Startup Delay Audit

Generated: 2026-07-03T05:40:21.199Z

## Track row elapsed (under active track)

- Track row subline is **catalog static text**: `n/a`
- Engine time at ~8s sample: **2.9**
- Snapshot displayTime at ~8s: **2.9**

## Bottom player elapsed @ settle samples

### Spotify (~8s after click)

```json
{
  "tMs": 7867,
  "provider": 2.9,
  "engine": 2.9,
  "msc": 2.9,
  "store": 2.9,
  "snapshot": 2.9,
  "uiElapsed": "0:03",
  "uiSlider": 3,
  "trackRowDuration": "0:03 · 0:29",
  "isPlaying": true,
  "isLoading": false
}
```

_All layers aligned within tolerance at sample._

### Preview audio (~3s after click)

```json
{
  "tMs": 2847,
  "provider": 1.753342,
  "engine": 1.753342,
  "msc": 1.517969,
  "store": 1.517969,
  "snapshot": 1.517969,
  "uiElapsed": "0:02",
  "uiSlider": 2,
  "trackRowDuration": null,
  "isPlaying": true,
  "isLoading": false
}
```

**First divergent layer:** msc — engine=1.753342 vs msc=1.517969

## Startup latency (ms from play click end)

### Spotify

```json
{
  "clickToProviderPlayMs": null,
  "clickToFirstPlaybackUpdateMs": 987,
  "clickToFirstEngineNonZeroMs": 2811,
  "clickToFirstSnapshotNonZeroMs": 2811,
  "clickToFirstUiElapsedNonZeroMs": 2811,
  "clickToEnginePlayRequestedMs": -52
}
```

### Preview

```json
{
  "clickToProviderPlayMs": null,
  "clickToFirstPlaybackUpdateMs": null,
  "clickToFirstEngineNonZeroMs": 1301,
  "clickToFirstSnapshotNonZeroMs": 1511,
  "clickToFirstUiElapsedNonZeroMs": 1829,
  "clickToEnginePlayRequestedMs": -43
}
```

## Spotify milestones

- t+1805ms **play-click-start**
- t+1970ms **engine-play-requested**: [ENGINE] play requested {refId: sara-landry::legacy, type: track, generation: 1, engineMounted: true}
- t+2022ms **play-click-end**
- t+3009ms **spotify-playback-update**: [VOLUME-TRACE] SpotifyProvider.onUpdate playback_update {id: 2, ts: 3005.199999999255, initiator: provider-playback_upda
- t+4833ms **first-engine-nonzero**: {"tMs":4833,"provider":0.775,"engine":0.775,"msc":0.775,"store":0.775,"snapshot":0.775,"uiElapsed":"0:01","uiSlider":1,"
- t+4833ms **first-snapshot-nonzero**: {"tMs":4833,"provider":0.775,"engine":0.775,"msc":0.775,"store":0.775,"snapshot":0.775,"uiElapsed":"0:01","uiSlider":1,"
- t+4833ms **first-ui-elapsed-nonzero**: {"tMs":4833,"provider":0.775,"engine":0.775,"msc":0.775,"store":0.775,"snapshot":0.775,"uiElapsed":"0:01","uiSlider":1,"

## Preview milestones

- t+2ms **play-click-start**
- t+9ms **click**: [CLICK] playItem {refId: hydration-audit::preview, type: track}
- t+14ms **engine-play-requested**: [ENGINE] play requested {refId: hydration-audit::preview, type: track, generation: 1, engineMounted: true}
- t+57ms **play-click-end**
- t+1358ms **first-engine-nonzero**: {"tMs":1358,"provider":0.26476,"engine":0.26476,"msc":0.188597,"store":0.188597,"snapshot":0.188597,"uiElapsed":"0:00","
- t+1568ms **first-snapshot-nonzero**: {"tMs":1568,"provider":0.47107,"engine":0.47107,"msc":0.4544,"store":0.4544,"snapshot":0.4544,"uiElapsed":"0:00","uiSlid
- t+1886ms **first-ui-elapsed-nonzero**: {"tMs":1886,"provider":0.793758,"engine":0.793758,"msc":0.721135,"store":0.721135,"snapshot":0.721135,"uiElapsed":"0:01"

## Refresh (paused → reload)

```json
{
  "before": {
    "action": "before-refresh-paused",
    "engine": {
      "mode": "spotify",
      "currentTrack": {
        "type": "track",
        "refId": "sara-landry::legacy",
        "label": "Legacy — Sara Landry",
        "title": "Legacy",
        "subtitle": "Sara Landry",
        "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
        "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
        "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
      },
      "isPlaying": false,
      "isLoading": false,
      "currentTime": 6.623,
      "duration": 29.713,
      "error": null
    },
    "msc": {
      "activeTrack": {
        "type": "track",
        "refId": "sara-landry::legacy",
        "label": "Legacy — Sara Landry",
        "title": "Legacy",
        "subtitle": "Sara Landry",
        "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
        "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
        "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
      },
      "currentTime": 6.623,
      "duration": 29.713,
      "isPlaying": false,
      "isBuffering": false,
      "isInitialLoading": false,
      "volume": 1,
      "muted": false,
      "error": null,
      "queue": [
        {
          "type": "track",
          "refId": "sara-landry::legacy",
          "label": "Legacy — Sara Landry",
          "title": "Legacy",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
          "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
          "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
        },
        {
          "type": "track",
          "refId": "sara-landry::pressure",
          "label": "Pressure — Sara Landry",
          "title": "Pressure",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e0249ba858c98dd5721233824b2",
          "spotifyUrl": "https://open.spotify.com/track/3LgA6sFAEZ30TqeTWmGDlV",
          "spotifyTrackId": "3LgA6sFAEZ30TqeTWmGDlV"
        },
        {
          "type": "track",
          "refId": "sara-landry::prisoner",
          "label": "Prisoner — Sara Landry",
          "title": "Prisoner",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/2Rb5DcNmRKGmMGB48cY8cy",
          "spotifyTrackId": "2Rb5DcNmRKGmMGB48cY8cy"
        },
        {
          "type": "track",
          "refId": "sara-landry::grief-into-rage",
          "label": "Grief Into Rage — Sara Landry",
          "title": "Grief Into Rage",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e028bc0122685a6779c3b6f583c",
          "spotifyUrl": "https://open.spotify.com/track/0JmFNORLiAQwtz48DsqeD0",
          "spotifyTrackId": "0JmFNORLiAQwtz48DsqeD0"
        },
        {
          "type": "track",
          "refId": "sara-landry::chaos-magicka",
          "label": "Chaos Magicka — Sara Landry",
          "title": "Chaos Magicka",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c4eae66d7f48d3265e36b458",
          "spotifyUrl": "https://open.spotify.com/track/5I5urH7JO7rRAUI4JCodLW",
          "spotifyTrackId": "5I5urH7JO7rRAUI4JCodLW"
        },
        {
          "type": "track",
          "refId": "sara-landry::girlboss",
          "label": "GIRLBOSS — Sara Landry",
          "title": "GIRLBOSS",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c487becf6108d5717eee203b",
          "spotifyUrl": "https://open.spotify.com/track/04WxwL4ZRewLveO2qjej54",
          "spotifyTrackId": "04WxwL4ZRewLveO2qjej54"
        },
        {
          "type": "track",
          "refId": "sara-landry::reality-check",
          "label": "Reality Check — Sara Landry",
          "title": "Reality Check",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02acb561f24c53f9f7672c209c",
          "spotifyUrl": "https://open.spotify.com/track/4RB7S3C5A6ziH6Jni0Jlxv",
          "spotifyTrackId": "4RB7S3C5A6ziH6Jni0Jlxv"
        },
        {
          "type": "track",
          "refId": "sara-landry::heaven",
          "label": "Heaven — Sara Landry",
          "title": "Heaven",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/5Hh09KHzQ9NRjRd6HIes5R",
          "spotifyTrackId": "5Hh09KHzQ9NRjRd6HIes5R"
        }
      ],
      "queueIndex": 0,
      "isSeeking": false,
      "seekPreviewTime": null,
      "hoverPreviewTime": null
    },
    "store": {
      "currentTrack": {
        "type": "track",
        "refId": "sara-landry::legacy",
        "label": "Legacy — Sara Landry",
        "title": "Legacy",
        "subtitle": "Sara Landry",
        "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
        "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
        "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
      },
      "queue": [
        {
          "type": "track",
          "refId": "sara-landry::legacy",
          "label": "Legacy — Sara Landry",
          "title": "Legacy",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
          "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
          "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
        },
        {
          "type": "track",
          "refId": "sara-landry::pressure",
          "label": "Pressure — Sara Landry",
          "title": "Pressure",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e0249ba858c98dd5721233824b2",
          "spotifyUrl": "https://open.spotify.com/track/3LgA6sFAEZ30TqeTWmGDlV",
          "spotifyTrackId": "3LgA6sFAEZ30TqeTWmGDlV"
        },
        {
          "type": "track",
          "refId": "sara-landry::prisoner",
          "label": "Prisoner — Sara Landry",
          "title": "Prisoner",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/2Rb5DcNmRKGmMGB48cY8cy",
          "spotifyTrackId": "2Rb5DcNmRKGmMGB48cY8cy"
        },
        {
          "type": "track",
          "refId": "sara-landry::grief-into-rage",
          "label": "Grief Into Rage — Sara Landry",
          "title": "Grief Into Rage",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e028bc0122685a6779c3b6f583c",
          "spotifyUrl": "https://open.spotify.com/track/0JmFNORLiAQwtz48DsqeD0",
          "spotifyTrackId": "0JmFNORLiAQwtz48DsqeD0"
        },
        {
          "type": "track",
          "refId": "sara-landry::chaos-magicka",
          "label": "Chaos Magicka — Sara Landry",
          "title": "Chaos Magicka",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c4eae66d7f48d3265e36b458",
          "spotifyUrl": "https://open.spotify.com/track/5I5urH7JO7rRAUI4JCodLW",
          "spotifyTrackId": "5I5urH7JO7rRAUI4JCodLW"
        },
        {
          "type": "track",
          "refId": "sara-landry::girlboss",
          "label": "GIRLBOSS — Sara Landry",
          "title": "GIRLBOSS",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c487becf6108d5717eee203b",
          "spotifyUrl": "https://open.spotify.com/track/04WxwL4ZRewLveO2qjej54",
          "spotifyTrackId": "04WxwL4ZRewLveO2qjej54"
        },
        {
          "type": "track",
          "refId": "sara-landry::reality-check",
          "label": "Reality Check — Sara Landry",
          "title": "Reality Check",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02acb561f24c53f9f7672c209c",
          "spotifyUrl": "https://open.spotify.com/track/4RB7S3C5A6ziH6Jni0Jlxv",
          "spotifyTrackId": "4RB7S3C5A6ziH6Jni0Jlxv"
        },
        {
          "type": "track",
          "refId": "sara-landry::heaven",
          "label": "Heaven — Sara Landry",
          "title": "Heaven",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/5Hh09KHzQ9NRjRd6HIes5R",
          "spotifyTrackId": "5Hh09KHzQ9NRjRd6HIes5R"
        }
      ],
      "queueIndex": 0,
      "isPlaying": false,
      "isLoading": false,
      "currentTime": 6.623,
      "duration": 29.713,
      "error": null,
      "volume": 1,
      "muted": false,
      "detailsOpen": true,
      "hydrated": true
    },
    "finalSnap": {
      "displayTime": 6.623,
      "currentTime": 6.623,
      "duration": 29.713,
      "isPlaying": false,
      "isScrubbing": false,
      "activeTrack": {
        "type": "track",
        "refId": "sara-landry::legacy",
        "label": "Legacy — Sara Landry",
        "title": "Legacy",
        "subtitle": "Sara Landry",
        "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
        "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
        "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
      },
      "queue": [
        {
          "type": "track",
          "refId": "sara-landry::legacy",
          "label": "Legacy — Sara Landry",
          "title": "Legacy",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
          "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
          "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
        },
        {
          "type": "track",
          "refId": "sara-landry::pressure",
          "label": "Pressure — Sara Landry",
          "title": "Pressure",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e0249ba858c98dd5721233824b2",
          "spotifyUrl": "https://open.spotify.com/track/3LgA6sFAEZ30TqeTWmGDlV",
          "spotifyTrackId": "3LgA6sFAEZ30TqeTWmGDlV"
        },
        {
          "type": "track",
          "refId": "sara-landry::prisoner",
          "label": "Prisoner — Sara Landry",
          "title": "Prisoner",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/2Rb5DcNmRKGmMGB48cY8cy",
          "spotifyTrackId": "2Rb5DcNmRKGmMGB48cY8cy"
        },
        {
          "type": "track",
          "refId": "sara-landry::grief-into-rage",
          "label": "Grief Into Rage — Sara Landry",
          "title": "Grief Into Rage",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e028bc0122685a6779c3b6f583c",
          "spotifyUrl": "https://open.spotify.com/track/0JmFNORLiAQwtz48DsqeD0",
          "spotifyTrackId": "0JmFNORLiAQwtz48DsqeD0"
        },
        {
          "type": "track",
          "refId": "sara-landry::chaos-magicka",
          "label": "Chaos Magicka — Sara Landry",
          "title": "Chaos Magicka",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c4eae66d7f48d3265e36b458",
          "spotifyUrl": "https://open.spotify.com/track/5I5urH7JO7rRAUI4JCodLW",
          "spotifyTrackId": "5I5urH7JO7rRAUI4JCodLW"
        },
        {
          "type": "track",
          "refId": "sara-landry::girlboss",
          "label": "GIRLBOSS — Sara Landry",
          "title": "GIRLBOSS",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c487becf6108d5717eee203b",
          "spotifyUrl": "https://open.spotify.com/track/04WxwL4ZRewLveO2qjej54",
          "spotifyTrackId": "04WxwL4ZRewLveO2qjej54"
        },
        {
          "type": "track",
          "refId": "sara-landry::reality-check",
          "label": "Reality Check — Sara Landry",
          "title": "Reality Check",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02acb561f24c53f9f7672c209c",
          "spotifyUrl": "https://open.spotify.com/track/4RB7S3C5A6ziH6Jni0Jlxv",
          "spotifyTrackId": "4RB7S3C5A6ziH6Jni0Jlxv"
        },
        {
          "type": "track",
          "refId": "sara-landry::heaven",
          "label": "Heaven — Sara Landry",
          "title": "Heaven",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/5Hh09KHzQ9NRjRd6HIes5R",
          "spotifyTrackId": "5Hh09KHzQ9NRjRd6HIes5R"
        }
      ],
      "queueIndex": 0,
      "error": null,
      "isBuffering": false,
      "isInitialLoading": false,
      "isLoading": false,
      "isSeeking": false,
      "volume": 1,
      "muted": false
    },
    "ui": {
      "sliderValue": 7,
      "sliderMax": 29,
      "elapsedLabel": "0:07",
      "playVisible": true,
      "pauseVisible": false,
      "currentTime": 7,
      "duration": 29,
      "isPlaying": false,
      "currentTrack": "sara-landry::legacy"
    },
    "divergence": {
      "ts": 1783057208256,
      "action": "before-refresh-paused",
      "field": "currentTime",
      "provider": 6.623,
      "engine": 6.623,
      "msc": 6.623,
      "store": 6.623,
      "snapshot": 6.623,
      "ui": 7,
      "firstDivergentLayer": "ui"
    }
  },
  "after": {
    "action": "after-refresh",
    "engine": {
      "mode": "idle",
      "currentTrack": null,
      "isPlaying": false,
      "isLoading": false,
      "currentTime": 0,
      "duration": 0,
      "error": null
    },
    "msc": {
      "activeTrack": {
        "type": "track",
        "refId": "sara-landry::legacy",
        "label": "Legacy — Sara Landry",
        "title": "Legacy",
        "subtitle": "Sara Landry",
        "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
        "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
        "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
      },
      "currentTime": 6.623,
      "duration": 0,
      "isPlaying": false,
      "isBuffering": false,
      "isInitialLoading": false,
      "volume": 1,
      "muted": false,
      "error": null,
      "queue": [
        {
          "type": "track",
          "refId": "sara-landry::legacy",
          "label": "Legacy — Sara Landry",
          "title": "Legacy",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
          "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
          "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
        },
        {
          "type": "track",
          "refId": "sara-landry::pressure",
          "label": "Pressure — Sara Landry",
          "title": "Pressure",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e0249ba858c98dd5721233824b2",
          "spotifyUrl": "https://open.spotify.com/track/3LgA6sFAEZ30TqeTWmGDlV",
          "spotifyTrackId": "3LgA6sFAEZ30TqeTWmGDlV"
        },
        {
          "type": "track",
          "refId": "sara-landry::prisoner",
          "label": "Prisoner — Sara Landry",
          "title": "Prisoner",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/2Rb5DcNmRKGmMGB48cY8cy",
          "spotifyTrackId": "2Rb5DcNmRKGmMGB48cY8cy"
        },
        {
          "type": "track",
          "refId": "sara-landry::grief-into-rage",
          "label": "Grief Into Rage — Sara Landry",
          "title": "Grief Into Rage",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e028bc0122685a6779c3b6f583c",
          "spotifyUrl": "https://open.spotify.com/track/0JmFNORLiAQwtz48DsqeD0",
          "spotifyTrackId": "0JmFNORLiAQwtz48DsqeD0"
        },
        {
          "type": "track",
          "refId": "sara-landry::chaos-magicka",
          "label": "Chaos Magicka — Sara Landry",
          "title": "Chaos Magicka",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c4eae66d7f48d3265e36b458",
          "spotifyUrl": "https://open.spotify.com/track/5I5urH7JO7rRAUI4JCodLW",
          "spotifyTrackId": "5I5urH7JO7rRAUI4JCodLW"
        },
        {
          "type": "track",
          "refId": "sara-landry::girlboss",
          "label": "GIRLBOSS — Sara Landry",
          "title": "GIRLBOSS",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c487becf6108d5717eee203b",
          "spotifyUrl": "https://open.spotify.com/track/04WxwL4ZRewLveO2qjej54",
          "spotifyTrackId": "04WxwL4ZRewLveO2qjej54"
        },
        {
          "type": "track",
          "refId": "sara-landry::reality-check",
          "label": "Reality Check — Sara Landry",
          "title": "Reality Check",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02acb561f24c53f9f7672c209c",
          "spotifyUrl": "https://open.spotify.com/track/4RB7S3C5A6ziH6Jni0Jlxv",
          "spotifyTrackId": "4RB7S3C5A6ziH6Jni0Jlxv"
        },
        {
          "type": "track",
          "refId": "sara-landry::heaven",
          "label": "Heaven — Sara Landry",
          "title": "Heaven",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/5Hh09KHzQ9NRjRd6HIes5R",
          "spotifyTrackId": "5Hh09KHzQ9NRjRd6HIes5R"
        }
      ],
      "queueIndex": 0,
      "isSeeking": false,
      "seekPreviewTime": null,
      "hoverPreviewTime": null
    },
    "store": {
      "currentTrack": {
        "type": "track",
        "refId": "sara-landry::legacy",
        "label": "Legacy — Sara Landry",
        "title": "Legacy",
        "subtitle": "Sara Landry",
        "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
        "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
        "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
      },
      "queue": [
        {
          "type": "track",
          "refId": "sara-landry::legacy",
          "label": "Legacy — Sara Landry",
          "title": "Legacy",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
          "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
          "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
        },
        {
          "type": "track",
          "refId": "sara-landry::pressure",
          "label": "Pressure — Sara Landry",
          "title": "Pressure",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e0249ba858c98dd5721233824b2",
          "spotifyUrl": "https://open.spotify.com/track/3LgA6sFAEZ30TqeTWmGDlV",
          "spotifyTrackId": "3LgA6sFAEZ30TqeTWmGDlV"
        },
        {
          "type": "track",
          "refId": "sara-landry::prisoner",
          "label": "Prisoner — Sara Landry",
          "title": "Prisoner",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/2Rb5DcNmRKGmMGB48cY8cy",
          "spotifyTrackId": "2Rb5DcNmRKGmMGB48cY8cy"
        },
        {
          "type": "track",
          "refId": "sara-landry::grief-into-rage",
          "label": "Grief Into Rage — Sara Landry",
          "title": "Grief Into Rage",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e028bc0122685a6779c3b6f583c",
          "spotifyUrl": "https://open.spotify.com/track/0JmFNORLiAQwtz48DsqeD0",
          "spotifyTrackId": "0JmFNORLiAQwtz48DsqeD0"
        },
        {
          "type": "track",
          "refId": "sara-landry::chaos-magicka",
          "label": "Chaos Magicka — Sara Landry",
          "title": "Chaos Magicka",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c4eae66d7f48d3265e36b458",
          "spotifyUrl": "https://open.spotify.com/track/5I5urH7JO7rRAUI4JCodLW",
          "spotifyTrackId": "5I5urH7JO7rRAUI4JCodLW"
        },
        {
          "type": "track",
          "refId": "sara-landry::girlboss",
          "label": "GIRLBOSS — Sara Landry",
          "title": "GIRLBOSS",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c487becf6108d5717eee203b",
          "spotifyUrl": "https://open.spotify.com/track/04WxwL4ZRewLveO2qjej54",
          "spotifyTrackId": "04WxwL4ZRewLveO2qjej54"
        },
        {
          "type": "track",
          "refId": "sara-landry::reality-check",
          "label": "Reality Check — Sara Landry",
          "title": "Reality Check",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02acb561f24c53f9f7672c209c",
          "spotifyUrl": "https://open.spotify.com/track/4RB7S3C5A6ziH6Jni0Jlxv",
          "spotifyTrackId": "4RB7S3C5A6ziH6Jni0Jlxv"
        },
        {
          "type": "track",
          "refId": "sara-landry::heaven",
          "label": "Heaven — Sara Landry",
          "title": "Heaven",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/5Hh09KHzQ9NRjRd6HIes5R",
          "spotifyTrackId": "5Hh09KHzQ9NRjRd6HIes5R"
        }
      ],
      "queueIndex": 0,
      "isPlaying": false,
      "isLoading": false,
      "currentTime": 6.623,
      "duration": 0,
      "error": null,
      "volume": 1,
      "muted": false,
      "detailsOpen": false,
      "hydrated": true
    },
    "finalSnap": {
      "displayTime": 0,
      "currentTime": 0,
      "duration": 0,
      "isPlaying": false,
      "isScrubbing": false,
      "activeTrack": {
        "type": "track",
        "refId": "sara-landry::legacy",
        "label": "Legacy — Sara Landry",
        "title": "Legacy",
        "subtitle": "Sara Landry",
        "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
        "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
        "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
      },
      "queue": [
        {
          "type": "track",
          "refId": "sara-landry::legacy",
          "label": "Legacy — Sara Landry",
          "title": "Legacy",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02869b8fb7716ab4d6cbb92679",
          "spotifyUrl": "https://open.spotify.com/track/0aMonkh8OKgqx1K0viRHRT",
          "spotifyTrackId": "0aMonkh8OKgqx1K0viRHRT"
        },
        {
          "type": "track",
          "refId": "sara-landry::pressure",
          "label": "Pressure — Sara Landry",
          "title": "Pressure",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e0249ba858c98dd5721233824b2",
          "spotifyUrl": "https://open.spotify.com/track/3LgA6sFAEZ30TqeTWmGDlV",
          "spotifyTrackId": "3LgA6sFAEZ30TqeTWmGDlV"
        },
        {
          "type": "track",
          "refId": "sara-landry::prisoner",
          "label": "Prisoner — Sara Landry",
          "title": "Prisoner",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/2Rb5DcNmRKGmMGB48cY8cy",
          "spotifyTrackId": "2Rb5DcNmRKGmMGB48cY8cy"
        },
        {
          "type": "track",
          "refId": "sara-landry::grief-into-rage",
          "label": "Grief Into Rage — Sara Landry",
          "title": "Grief Into Rage",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e028bc0122685a6779c3b6f583c",
          "spotifyUrl": "https://open.spotify.com/track/0JmFNORLiAQwtz48DsqeD0",
          "spotifyTrackId": "0JmFNORLiAQwtz48DsqeD0"
        },
        {
          "type": "track",
          "refId": "sara-landry::chaos-magicka",
          "label": "Chaos Magicka — Sara Landry",
          "title": "Chaos Magicka",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c4eae66d7f48d3265e36b458",
          "spotifyUrl": "https://open.spotify.com/track/5I5urH7JO7rRAUI4JCodLW",
          "spotifyTrackId": "5I5urH7JO7rRAUI4JCodLW"
        },
        {
          "type": "track",
          "refId": "sara-landry::girlboss",
          "label": "GIRLBOSS — Sara Landry",
          "title": "GIRLBOSS",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02c487becf6108d5717eee203b",
          "spotifyUrl": "https://open.spotify.com/track/04WxwL4ZRewLveO2qjej54",
          "spotifyTrackId": "04WxwL4ZRewLveO2qjej54"
        },
        {
          "type": "track",
          "refId": "sara-landry::reality-check",
          "label": "Reality Check — Sara Landry",
          "title": "Reality Check",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02acb561f24c53f9f7672c209c",
          "spotifyUrl": "https://open.spotify.com/track/4RB7S3C5A6ziH6Jni0Jlxv",
          "spotifyTrackId": "4RB7S3C5A6ziH6Jni0Jlxv"
        },
        {
          "type": "track",
          "refId": "sara-landry::heaven",
          "label": "Heaven — Sara Landry",
          "title": "Heaven",
          "subtitle": "Sara Landry",
          "coverArt": "https://i.scdn.co/image/ab67616d00001e02143dad492c28a44c1e78b8f4",
          "spotifyUrl": "https://open.spotify.com/track/5Hh09KHzQ9NRjRd6HIes5R",
          "spotifyTrackId": "5Hh09KHzQ9NRjRd6HIes5R"
        }
      ],
      "queueIndex": 0,
      "error": null,
      "isBuffering": false,
      "isInitialLoading": false,
      "isLoading": false,
      "isSeeking": false,
      "volume": 1,
      "muted": false
    },
    "ui": {
      "sliderValue": 0,
      "sliderMax": 1,
      "elapsedLabel": "0:00",
      "playVisible": true,
      "pauseVisible": false,
      "currentTime": 0,
      "duration": 1,
      "isPlaying": false,
      "currentTrack": "sara-landry::legacy"
    },
    "divergence": {
      "ts": 1783057211441,
      "action": "after-refresh",
      "field": "currentTime",
      "provider": 0,
      "engine": 0,
      "msc": 6.623,
      "store": 6.623,
      "snapshot": 0,
      "ui": 0,
      "firstDivergentLayer": "msc"
    }
  }
}
```