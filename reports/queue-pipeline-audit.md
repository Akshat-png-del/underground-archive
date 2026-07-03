# Queue Pipeline Runtime Audit

Generated: 2026-07-03T05:17:58.045Z

## Samples

### after-initial-play (t+6992ms)

```json
{
  "label": "after-initial-play",
  "ts": 1783055848700,
  "msc": {
    "activeTrack": "sara-landry::legacy",
    "queueIndex": 0,
    "queueLength": 8,
    "currentTime": 1.864
  },
  "engine": {
    "activeTrack": "sara-landry::legacy",
    "mode": "spotify"
  },
  "store": {
    "activeTrack": "sara-landry::legacy",
    "queueIndex": 0,
    "queueLength": 8
  },
  "snapshot": {
    "activeTrack": "sara-landry::legacy",
    "queueIndex": 0,
    "queueLength": 8
  },
  "ui": {
    "title": "Sara Landry"
  }
}
```
### after-next (t+13060ms)

```json
{
  "label": "after-next",
  "ts": 1783055854758,
  "msc": {
    "activeTrack": "sara-landry::pressure",
    "queueIndex": 1,
    "queueLength": 8,
    "currentTime": 4.167
  },
  "engine": {
    "activeTrack": "sara-landry::pressure",
    "mode": "spotify"
  },
  "store": {
    "activeTrack": "sara-landry::pressure",
    "queueIndex": 1,
    "queueLength": 8
  },
  "snapshot": {
    "activeTrack": "sara-landry::pressure",
    "queueIndex": 1,
    "queueLength": 8
  },
  "ui": {
    "title": "Sara Landry"
  }
}
```
### after-second-next (t+19112ms)

```json
{
  "label": "after-second-next",
  "ts": 1783055860809,
  "msc": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8,
    "currentTime": 4.171
  },
  "engine": {
    "activeTrack": "sara-landry::prisoner",
    "mode": "spotify"
  },
  "store": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8
  },
  "snapshot": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8
  },
  "ui": {
    "title": "Sara Landry"
  }
}
```
### after-prev-restart-or-back (t+21132ms)

```json
{
  "label": "after-prev",
  "ts": 1783055862830,
  "msc": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8,
    "currentTime": 0
  },
  "engine": {
    "activeTrack": "sara-landry::prisoner",
    "mode": "spotify"
  },
  "store": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8
  },
  "snapshot": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8
  },
  "ui": {
    "title": "Sara Landry"
  }
}
```
### after-prev-from-start (t+28006ms)

```json
{
  "label": "after-prev-from-start",
  "ts": 1783055869703,
  "msc": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8,
    "currentTime": 13.749
  },
  "engine": {
    "activeTrack": "sara-landry::prisoner",
    "mode": "spotify"
  },
  "store": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8
  },
  "snapshot": {
    "activeTrack": "sara-landry::prisoner",
    "queueIndex": 2,
    "queueLength": 8
  },
  "ui": {
    "title": "Sara Landry"
  }
}
```
### after-auto-advance (t+34094ms)

```json
{
  "label": "after-auto-advance",
  "ts": 1783055875792,
  "msc": {
    "activeTrack": "sara-landry::grief-into-rage",
    "queueIndex": 3,
    "queueLength": 8,
    "currentTime": 4.169
  },
  "engine": {
    "activeTrack": "sara-landry::grief-into-rage",
    "mode": "spotify"
  },
  "store": {
    "activeTrack": "sara-landry::grief-into-rage",
    "queueIndex": 3,
    "queueLength": 8
  },
  "snapshot": {
    "activeTrack": "sara-landry::grief-into-rage",
    "queueIndex": 3,
    "queueLength": 8
  },
  "ui": {
    "title": "Sara Landry"
  }
}
```
### after-navigate (t+36323ms)

```json
{
  "label": "after-navigate",
  "ts": 1783055878020,
  "msc": {
    "activeTrack": "sara-landry::grief-into-rage",
    "queueIndex": 3,
    "queueLength": 8,
    "currentTime": 4.169
  },
  "engine": {
    "activeTrack": "sara-landry::grief-into-rage",
    "mode": "spotify"
  },
  "store": {
    "activeTrack": "sara-landry::grief-into-rage",
    "queueIndex": 3,
    "queueLength": 8
  },
  "snapshot": {
    "activeTrack": "sara-landry::grief-into-rage",
    "queueIndex": 3,
    "queueLength": 8
  },
  "ui": {
    "title": "Sara Landry"
  }
}
```

## Navigation events

- t+551ms `MediaSessionController.applyReconciledTransport` queue_index {"id":4,"ts":537.9000000003725,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":null,"targetActiveTrack":null,"trackChanged":false,"transportPatched":true}
- t+1957ms `MediaSessionController.play` enter {"id":29,"ts":1858.199999999255,"fn":"MediaSessionController.play","phase":"enter","targetActiveTrack":"sara-landry::legacy","currentActiveTrack":null,"currentQueueIndex":0,"targetQueueIndex":0,"queueLength":8,"duplicatePlay":false,"pendingPlay":false}
- t+1959ms `ProviderRouter.play` enter {"id":36,"ts":1893.9000000003725,"fn":"ProviderRouter.play","phase":"enter","targetActiveTrack":"sara-landry::legacy","providerKind":"spotify","extra":{"generation":1,"activeKind":null}}
- t+1959ms `MediaSessionController.applyReconciledTransport` queue_index {"id":39,"ts":1895.9000000003725,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::legacy","trackChanged":false,"transportPatched":true}
- t+3728ms `MediaSessionController.applyReconciledTransport` queue_index {"id":43,"ts":3702.199999999255,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::legacy","trackChanged":false,"transportPatched":true}
- t+3734ms `ProviderRouter.play` playback_confirmed {"id":45,"ts":3719,"fn":"ProviderRouter.play","phase":"playback_confirmed","targetActiveTrack":"sara-landry::legacy","providerKind":"spotify"}
- t+3962ms `MediaSessionController.applyReconciledTransport` queue_index {"id":49,"ts":3930.9000000003725,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::legacy","trackChanged":false,"transportPatched":true}
- t+4711ms `MediaSessionController.applyReconciledTransport` queue_index {"id":54,"ts":4664.4000000003725,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::legacy","trackChanged":false,"transportPatched":true}
- t+4723ms `MediaSessionController.applyReconciledTransport` queue_index {"id":58,"ts":4687.799999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::legacy","trackChanged":false,"transportPatched":true}
- t+5356ms `MediaSessionController.applyReconciledTransport` queue_index {"id":63,"ts":5320.799999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::legacy","trackChanged":false,"transportPatched":true}
- t+5745ms `MediaSessionController.applyReconciledTransport` queue_index {"id":69,"ts":5716.0999999996275,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::legacy","trackChanged":false,"transportPatched":true}
- t+6807ms `MediaSessionController.applyReconciledTransport` queue_index {"id":75,"ts":6782,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":0,"currentQueueIndex":0,"mscActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::legacy","trackChanged":false,"transportPatched":true}
- t+7057ms `MediaSessionController.next` enter {"id":78,"ts":7002.5999999996275,"fn":"MediaSessionController.next","phase":"enter","event":"next","currentQueueIndex":0,"targetQueueIndex":1,"queueLength":8,"currentActiveTrack":"sara-landry::legacy","targetActiveTrack":"sara-landry::pressure"}
- t+7057ms `MediaSessionController.play` enter {"id":79,"ts":7003.0999999996275,"fn":"MediaSessionController.play","phase":"enter","targetActiveTrack":"sara-landry::pressure","currentActiveTrack":"sara-landry::legacy","currentQueueIndex":0,"targetQueueIndex":1,"queueLength":8,"duplicatePlay":false,"pendingPlay":false}
- t+7060ms `ProviderRouter.play` enter {"id":84,"ts":7023.199999999255,"fn":"ProviderRouter.play","phase":"enter","targetActiveTrack":"sara-landry::pressure","providerKind":"spotify","extra":{"generation":2,"activeKind":"spotify"}}
- t+7060ms `MediaSessionController.applyReconciledTransport` queue_index {"id":88,"ts":7031.799999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+7648ms `MediaSessionController.applyReconciledTransport` queue_index {"id":92,"ts":7624.199999999255,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+7649ms `ProviderRouter.play` playback_confirmed {"id":94,"ts":7637.9000000003725,"fn":"ProviderRouter.play","phase":"playback_confirmed","targetActiveTrack":"sara-landry::pressure","providerKind":"spotify"}
- t+7871ms `MediaSessionController.applyReconciledTransport` queue_index {"id":98,"ts":7849.4000000003725,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+8221ms `MediaSessionController.applyReconciledTransport` queue_index {"id":103,"ts":8183.5999999996275,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+8221ms `MediaSessionController.applyReconciledTransport` queue_index {"id":107,"ts":8198.199999999255,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+8902ms `MediaSessionController.applyReconciledTransport` queue_index {"id":112,"ts":8881,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+9310ms `MediaSessionController.applyReconciledTransport` queue_index {"id":118,"ts":9278.799999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+10373ms `MediaSessionController.applyReconciledTransport` queue_index {"id":124,"ts":10341,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+11431ms `MediaSessionController.applyReconciledTransport` queue_index {"id":130,"ts":11402.299999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+12498ms `MediaSessionController.applyReconciledTransport` queue_index {"id":136,"ts":12467.699999999255,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":1,"currentQueueIndex":1,"mscActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::pressure","trackChanged":false,"transportPatched":true}
- t+13117ms `MediaSessionController.next` enter {"id":139,"ts":13061.299999998882,"fn":"MediaSessionController.next","phase":"enter","event":"next","currentQueueIndex":1,"targetQueueIndex":2,"queueLength":8,"currentActiveTrack":"sara-landry::pressure","targetActiveTrack":"sara-landry::prisoner"}
- t+13117ms `MediaSessionController.play` enter {"id":140,"ts":13062.199999999255,"fn":"MediaSessionController.play","phase":"enter","targetActiveTrack":"sara-landry::prisoner","currentActiveTrack":"sara-landry::pressure","currentQueueIndex":1,"targetQueueIndex":2,"queueLength":8,"duplicatePlay":false,"pendingPlay":false}
- t+13118ms `ProviderRouter.play` enter {"id":145,"ts":13087.699999999255,"fn":"ProviderRouter.play","phase":"enter","targetActiveTrack":"sara-landry::prisoner","providerKind":"spotify","extra":{"generation":3,"activeKind":"spotify"}}
- t+13118ms `MediaSessionController.applyReconciledTransport` queue_index {"id":149,"ts":13091.400000000373,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+13508ms `MediaSessionController.applyReconciledTransport` queue_index {"id":153,"ts":13486.599999999627,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+13510ms `ProviderRouter.play` playback_confirmed {"id":155,"ts":13500,"fn":"ProviderRouter.play","phase":"playback_confirmed","targetActiveTrack":"sara-landry::prisoner","providerKind":"spotify"}
- t+13741ms `MediaSessionController.applyReconciledTransport` queue_index {"id":159,"ts":13710,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+14053ms `MediaSessionController.applyReconciledTransport` queue_index {"id":164,"ts":14020.400000000373,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+14053ms `MediaSessionController.applyReconciledTransport` queue_index {"id":168,"ts":14033.299999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+14711ms `MediaSessionController.applyReconciledTransport` queue_index {"id":173,"ts":14680,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+15106ms `MediaSessionController.applyReconciledTransport` queue_index {"id":179,"ts":15075.299999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+16168ms `MediaSessionController.applyReconciledTransport` queue_index {"id":185,"ts":16137.799999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+17232ms `MediaSessionController.applyReconciledTransport` queue_index {"id":191,"ts":17201.699999999255,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+18296ms `MediaSessionController.applyReconciledTransport` queue_index {"id":197,"ts":18263.900000000373,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+19132ms `MediaSessionController.prev` restart_current {"id":200,"ts":19109.900000000373,"fn":"MediaSessionController.prev","phase":"restart_current","event":"prev","currentTime":4.171,"note":"currentTime > 3 → commitSeek(0)"}
- t+19133ms `MediaSessionController.applyReconciledTransport` queue_index {"id":205,"ts":19113.099999999627,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+19355ms `MediaSessionController.applyReconciledTransport` queue_index {"id":211,"ts":19325.099999999627,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+20416ms `MediaSessionController.applyReconciledTransport` queue_index {"id":217,"ts":20387.400000000373,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+21168ms `MediaSessionController.applyReconciledTransport` queue_index {"id":224,"ts":21139.5,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+21481ms `MediaSessionController.applyReconciledTransport` queue_index {"id":230,"ts":21450.799999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+22002ms `MediaSessionController.prev` restart_current {"id":232,"ts":21963.299999998882,"fn":"MediaSessionController.prev","phase":"restart_current","event":"prev","currentTime":7.361,"note":"currentTime > 3 → commitSeek(0)"}
- t+22004ms `MediaSessionController.applyReconciledTransport` queue_index {"id":237,"ts":21968.699999999255,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+22560ms `MediaSessionController.applyReconciledTransport` queue_index {"id":243,"ts":22529,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+23622ms `MediaSessionController.applyReconciledTransport` queue_index {"id":249,"ts":23591.099999999627,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+24685ms `MediaSessionController.applyReconciledTransport` queue_index {"id":255,"ts":24653.699999999255,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+25747ms `MediaSessionController.applyReconciledTransport` queue_index {"id":261,"ts":25718.599999999627,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+26796ms `MediaSessionController.applyReconciledTransport` queue_index {"id":267,"ts":26776.599999999627,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+27880ms `MediaSessionController.applyReconciledTransport` queue_index {"id":273,"ts":27844.599999999627,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":2,"currentQueueIndex":2,"mscActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::prisoner","trackChanged":false,"transportPatched":true}
- t+28093ms `MediaSessionController.advanceQueueOnEnd` enter {"id":276,"ts":28005.299999998882,"fn":"MediaSessionController.advanceQueueOnEnd","phase":"enter","event":"auto_advance","currentQueueIndex":2,"targetQueueIndex":3,"queueLength":8,"currentActiveTrack":"sara-landry::prisoner","targetActiveTrack":"sara-landry::grief-into-rage"}
- t+28094ms `MediaSessionController.play` enter {"id":277,"ts":28006.599999999627,"fn":"MediaSessionController.play","phase":"enter","targetActiveTrack":"sara-landry::grief-into-rage","currentActiveTrack":"sara-landry::prisoner","currentQueueIndex":2,"targetQueueIndex":3,"queueLength":8,"duplicatePlay":false,"pendingPlay":false}
- t+28094ms `ProviderRouter.play` enter {"id":282,"ts":28031.099999999627,"fn":"ProviderRouter.play","phase":"enter","targetActiveTrack":"sara-landry::grief-into-rage","providerKind":"spotify","extra":{"generation":4,"activeKind":"spotify"}}
- t+28094ms `MediaSessionController.applyReconciledTransport` queue_index {"id":286,"ts":28035.299999998882,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":3,"currentQueueIndex":3,"mscActiveTrack":"sara-landry::grief-into-rage","targetActiveTrack":"sara-landry::grief-into-rage","trackChanged":false,"transportPatched":true}
- t+28373ms `MediaSessionController.applyReconciledTransport` queue_index {"id":290,"ts":28352.599999999627,"fn":"MediaSessionController.applyReconciledTransport","phase":"queue_index","queueReconciledIndex":3,"currentQueueIndex":3,"mscActiveTrack":"sara-landry::grief-into-rage","targetActiveTrack":"sara-landry::grief-into-rage","trackChanged":false,"transportPatched":true}
- t+28375ms `ProviderRouter.play` playback_confirmed {"id":292,"ts":28365,"fn":"ProviderRouter.play","phase":"playback_confirmed","targetActiveTrack":"sara-landry::grief-into-rage","providerKind":"spotify"}

Duplicate play() within 500ms: **0**

No sample divergence detected.