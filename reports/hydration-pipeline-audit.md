# Hydration Pipeline Audit

Generated: 2026-07-03T06:32:19.327Z

## Samples

- **8-cold-page-load** @ 2212ms
  msc=null idx=0 t=0.0 playing=false | engine=idle/null | bar=false
- **1-preview-playing-before-refresh** @ 7059ms
  msc=hydration-audit::preview idx=0 t=2.0 playing=true | engine=audio/hydration-audit::preview | bar=true
- **1-after-refresh-preview-playing** @ 12450ms
  msc=hydration-audit::preview idx=0 t=4.4 playing=true | engine=audio/hydration-audit::preview | bar=true
- **2-spotify-playing-before-refresh** @ 23105ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=audio/hydration-audit::preview | bar=true
- **2-after-refresh-spotify-playing** @ 33507ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true
- **3-paused-before-refresh** @ 35325ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true
- **3-after-refresh-paused** @ 39816ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true
- **4-navigate-away** @ 42233ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true
- **4-navigate-back** @ 45619ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true
- **5-after-browser-back** @ 56618ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true
- **6-after-browser-forward** @ 59911ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true
- **7-homepage** @ 62387ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true
- **7-return-to-artist** @ 65777ms
  msc=hydration-audit::preview idx=0 t=0.0 playing=false | engine=idle/null | bar=true

## Counters

- hydration_started: 21
- hydration_finished: 21
- mirror_push: 87
- engine_mount: 12
