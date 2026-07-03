# Playback Sync Audit — Runtime

Generated: 2026-07-03T05:10:01.376Z

## Actions sampled

- **after-play** @ t+6903ms — **DIVERGENCE**
- **after-pause** @ t+7802ms — **DIVERGENCE**
- **after-resume** @ t+9382ms — **DIVERGENCE**
- **after-seek-50pct** @ t+10658ms — **DIVERGENCE**
- **after-next** @ t+13774ms — **DIVERGENCE**
- **after-prev** @ t+15390ms — **DIVERGENCE**
- **volume-skipped-spotify** @ t+15400ms — **DIVERGENCE**

## First divergences per action

### after-play

```json
{
  "ts": 1783055392860,
  "action": "after-play",
  "field": "currentTime",
  "provider": 1.417,
  "engine": 1.417,
  "msc": 1.417,
  "store": 1.417,
  "snapshot": 1.417,
  "ui": 1,
  "firstDivergentLayer": "ui"
}
```

### after-pause

```json
{
  "ts": 1783055393749,
  "action": "after-pause",
  "field": "currentTime",
  "provider": 1.782,
  "engine": 1.782,
  "msc": 1.782,
  "store": 1.782,
  "snapshot": 1.782,
  "ui": 2,
  "firstDivergentLayer": "ui"
}
```

### after-resume

```json
{
  "ts": 1783055395329,
  "action": "after-resume",
  "field": "currentTime",
  "provider": 3.096,
  "engine": 3.096,
  "msc": 3.096,
  "store": 3.096,
  "snapshot": 3.096,
  "ui": 3,
  "firstDivergentLayer": "ui"
}
```

### after-seek-50pct

```json
{
  "ts": 1783055396606,
  "action": "after-seek-50pct",
  "field": "currentTime",
  "provider": 15.577,
  "engine": 15.577,
  "msc": 15.577,
  "store": 15.577,
  "snapshot": 15.577,
  "ui": 16,
  "firstDivergentLayer": "ui"
}
```

### after-next

```json
{
  "ts": 1783055399722,
  "action": "after-next",
  "field": "currentTime",
  "provider": 0.738,
  "engine": 0.738,
  "msc": 0.738,
  "store": 0.738,
  "snapshot": 0.738,
  "ui": 1,
  "firstDivergentLayer": "ui"
}
```

### after-prev

```json
{
  "ts": 1783055401338,
  "action": "after-prev",
  "field": "duration",
  "provider": 29.713,
  "engine": 29.713,
  "msc": 29.713,
  "store": 29.713,
  "snapshot": 29.713,
  "ui": 29,
  "firstDivergentLayer": "ui"
}
```

### volume-skipped-spotify

```json
{
  "ts": 1783055401346,
  "action": "volume-skipped-spotify",
  "field": "duration",
  "provider": 29.713,
  "engine": 29.713,
  "msc": 29.713,
  "store": 29.713,
  "snapshot": 29.713,
  "ui": 29,
  "firstDivergentLayer": "ui"
}
```


## Layer samples (last action)

```json
{
  "action": "volume-skipped-spotify",
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
    "isPlaying": true,
    "isLoading": false,
    "currentTime": 0,
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
    "currentTime": 0,
    "duration": 29.713,
    "isPlaying": true,
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
    "isPlaying": true,
    "isLoading": false,
    "currentTime": 0,
    "duration": 29.713,
    "error": null,
    "volume": 1,
    "muted": false,
    "detailsOpen": true,
    "hydrated": true
  },
  "finalSnap": {
    "displayTime": 0,
    "currentTime": 0,
    "duration": 29.713,
    "isPlaying": true,
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
    "sliderMax": 29,
    "elapsedLabel": "0:00",
    "playVisible": false,
    "pauseVisible": true,
    "currentTime": 0,
    "duration": 29,
    "isPlaying": true,
    "currentTrack": "sara-landry::legacy"
  },
  "divergence": {
    "ts": 1783055401346,
    "action": "volume-skipped-spotify",
    "field": "duration",
    "provider": 29.713,
    "engine": 29.713,
    "msc": 29.713,
    "store": 29.713,
    "snapshot": 29.713,
    "ui": 29,
    "firstDivergentLayer": "ui"
  }
}
```

## Console sync logs (last 40)

- t+13778ms [SYNC-AUDIT] {id: 166, action: after-next, layer: store, currentTime: 0.738, duration: 29.713}
- t+13778ms [SYNC-AUDIT] {id: 167, action: after-next, layer: snapshot, currentTime: 0.738, duration: 29.713}
- t+13778ms [SYNC-AUDIT] {id: 168, action: after-next, layer: ui, currentTime: 1, duration: 29}
- t+13778ms [SYNC-AUDIT] DIVERGENCE {ts: 1783055399722, action: after-next, field: currentTime, provider: 0.738, engine: 0.738}
- t+13826ms [SYNC-AUDIT] {id: 169, action: snapshot-commit, layer: snapshot, currentTime: 0.738, duration: 29.713}
- t+13854ms [SYNC-AUDIT] {id: 170, action: provider-tick, layer: provider, currentTime: 0, duration: 0}
- t+13854ms [SYNC-AUDIT] {id: 171, action: snapshot-commit, layer: snapshot, currentTime: 0, duration: 0}
- t+13854ms [SYNC-AUDIT] {id: 172, action: engine-publish, layer: engine, currentTime: 0, duration: 0}
- t+13854ms [SYNC-AUDIT] {id: 173, action: msc-reconcile, layer: msc, currentTime: 0, duration: 0}
- t+13854ms [SYNC-AUDIT] {id: 174, action: snapshot-commit, layer: snapshot, currentTime: 0, duration: 0}
- t+14376ms [SYNC-AUDIT] {id: 175, action: provider-tick, layer: provider, currentTime: 0, duration: 0}
- t+14376ms [SYNC-AUDIT] {id: 176, action: engine-publish, layer: engine, currentTime: 0, duration: 0}
- t+14376ms [SYNC-AUDIT] {id: 177, action: msc-reconcile, layer: msc, currentTime: 0, duration: 0}
- t+14376ms [SYNC-AUDIT] {id: 178, action: snapshot-commit, layer: snapshot, currentTime: 0, duration: 0}
- t+14599ms [SYNC-AUDIT] {id: 179, action: provider-tick, layer: provider, currentTime: 0, duration: 0}
- t+14599ms [SYNC-AUDIT] {id: 180, action: engine-publish, layer: engine, currentTime: 0, duration: 0}
- t+14603ms [SYNC-AUDIT] {id: 181, action: msc-reconcile, layer: msc, currentTime: 0, duration: 0}
- t+14603ms [SYNC-AUDIT] {id: 182, action: snapshot-commit, layer: snapshot, currentTime: 0, duration: 0}
- t+15029ms [SYNC-AUDIT] {id: 183, action: provider-tick, layer: provider, currentTime: 0, duration: 29.713}
- t+15029ms [SYNC-AUDIT] {id: 184, action: engine-publish, layer: engine, currentTime: 0, duration: 29.713}
- t+15029ms [SYNC-AUDIT] {id: 185, action: msc-reconcile, layer: msc, currentTime: 0, duration: 29.713}
- t+15030ms [SYNC-AUDIT] {id: 186, action: snapshot-commit, layer: snapshot, currentTime: 0, duration: 29.713}
- t+15039ms [SYNC-AUDIT] {id: 187, action: provider-tick, layer: provider, currentTime: 0, duration: 29.713}
- t+15040ms [SYNC-AUDIT] {id: 188, action: engine-publish, layer: engine, currentTime: 0, duration: 29.713}
- t+15040ms [SYNC-AUDIT] {id: 189, action: msc-reconcile, layer: msc, currentTime: 0, duration: 29.713}
- t+15040ms [SYNC-AUDIT] {id: 190, action: snapshot-commit, layer: snapshot, currentTime: 0, duration: 29.713}
- t+15395ms [SYNC-AUDIT] {id: 191, action: after-prev, layer: provider, currentTime: 0, duration: 29.713}
- t+15395ms [SYNC-AUDIT] {id: 192, action: after-prev, layer: engine, currentTime: 0, duration: 29.713}
- t+15395ms [SYNC-AUDIT] {id: 193, action: after-prev, layer: msc, currentTime: 0, duration: 29.713}
- t+15395ms [SYNC-AUDIT] {id: 194, action: after-prev, layer: store, currentTime: 0, duration: 29.713}
- t+15395ms [SYNC-AUDIT] {id: 195, action: after-prev, layer: snapshot, currentTime: 0, duration: 29.713}
- t+15395ms [SYNC-AUDIT] {id: 196, action: after-prev, layer: ui, currentTime: 0, duration: 29}
- t+15395ms [SYNC-AUDIT] DIVERGENCE {ts: 1783055401338, action: after-prev, field: duration, provider: 29.713, engine: 29.713}
- t+15403ms [SYNC-AUDIT] {id: 197, action: volume-skipped-spotify, layer: provider, currentTime: 0, duration: 29.713}
- t+15403ms [SYNC-AUDIT] {id: 198, action: volume-skipped-spotify, layer: engine, currentTime: 0, duration: 29.713}
- t+15403ms [SYNC-AUDIT] {id: 199, action: volume-skipped-spotify, layer: msc, currentTime: 0, duration: 29.713}
- t+15403ms [SYNC-AUDIT] {id: 200, action: volume-skipped-spotify, layer: store, currentTime: 0, duration: 29.713}
- t+15403ms [SYNC-AUDIT] {id: 201, action: volume-skipped-spotify, layer: snapshot, currentTime: 0, duration: 29.713}
- t+15403ms [SYNC-AUDIT] {id: 202, action: volume-skipped-spotify, layer: ui, currentTime: 0, duration: 29}
- t+15403ms [SYNC-AUDIT] DIVERGENCE {ts: 1783055401346, action: volume-skipped-spotify, field: duration, provider: 29.713, engine: 29.713}