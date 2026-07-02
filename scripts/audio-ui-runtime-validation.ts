/**
 * Runtime validation for audio UI: seek, time sync, volume, row toggle.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/audio-ui-runtime-validation.ts
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

interface Sample {
  t: number;
  storeTime: number;
  storeDuration: number;
  displayTime: string | null;
  isPlaying: boolean;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const findings: string[] = [];

  const log = (msg: string) => {
    console.log(msg);
    findings.push(msg);
  };

  try {
    await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    const row = page.locator('[id^="track-"]').first();
    if ((await row.count()) === 0) {
      log("FAIL: no track row found");
      return;
    }

    const rowId = await row.getAttribute("id");
    log(`INFO: using row ${rowId}`);

    // Play track via row pointerdown (simulates user click on row)
    await row.click();
    await page.waitForTimeout(4000);

    const barVisible = (await page.locator("[data-audio-player]").count()) > 0;
    log(`INFO: audio bar visible=${barVisible}`);

    const dump = () =>
      page.evaluate(() => {
        const w = window as Window & {
          __playbackDebugDump?: () => Record<string, unknown>;
        };
        const dumpFn = w.__playbackDebugDump;
        const store = dumpFn?.() ?? {};
        const seek = document.querySelector(".player-seek") as HTMLInputElement | null;
        const timeEl = document.querySelector(".spotify-player-seek span.font-mono");
        const volSlider = document.querySelector(".player-volume-slider") as HTMLInputElement | null;
        const volBtn = document.querySelector(".player-volume button");
        return {
          store,
          seekValue: seek ? Number(seek.value) : null,
          seekMax: seek ? Number(seek.max) : null,
          displayTime: timeEl?.textContent ?? null,
          volumeSliderPresent: !!volSlider,
          volumeSliderDisabled: volSlider?.disabled ?? null,
          volumeBtnDisabled: (volBtn as HTMLButtonElement | null)?.disabled ?? null,
          volumeBtnLabel: volBtn?.getAttribute("aria-label") ?? null,
        };
      });

    let before = await dump();
    log(`INFO: after play store=${JSON.stringify(before.store)}`);
    log(`INFO: seek value=${before.seekValue} max=${before.seekMax} display=${before.displayTime}`);
    log(
      `INFO: volume slider=${before.volumeSliderPresent} disabled=${before.volumeBtnDisabled} label=${before.volumeBtnLabel}`,
    );

    // Time sync samples over ~12s
    const samples: Sample[] = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(2000);
      const d = await dump();
      const s = d.store as { currentTime?: number; duration?: number; isPlaying?: boolean };
      samples.push({
        t: i * 2,
        storeTime: s.currentTime ?? 0,
        storeDuration: s.duration ?? 0,
        displayTime: d.displayTime,
        isPlaying: !!s.isPlaying,
      });
    }

    const timeDeltas = samples.slice(1).map((s, i) => s.storeTime - samples[i].storeTime);
    log(`INFO: time samples=${JSON.stringify(samples)}`);
    log(`INFO: store time deltas (2s apart)=${JSON.stringify(timeDeltas.map((d) => +d.toFixed(2)))}`);

    const monotonic = timeDeltas.every((d) => d >= -0.5);
    const advancing = timeDeltas.filter((d) => d > 0.3).length >= 2;
    log(`CHECK time monotonic=${monotonic} advancing=${advancing}`);

    // Click seek bar at 50%
    const seek = page.locator(".player-seek");
    if ((await seek.count()) > 0) {
      const box = await seek.boundingBox();
      if (box) {
        const clickX = box.x + box.width * 0.5;
        const clickY = box.y + box.height / 2;
        const preSeek = await dump();
        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(2500);
        const postSeek = await dump();
        const expectedRatio = 0.5;
        const max = postSeek.seekMax ?? 1;
        const actualRatio = (postSeek.seekValue ?? 0) / max;
        const storeTime = (postSeek.store as { currentTime?: number }).currentTime ?? 0;
        log(`INFO: seek click pre storeTime=${(preSeek.store as { currentTime?: number }).currentTime}`);
        log(
          `INFO: seek click post seekValue=${postSeek.seekValue} storeTime=${storeTime} max=${max} ratio=${actualRatio.toFixed(3)}`,
        );
        const seekAccurate = Math.abs(actualRatio - expectedRatio) < 0.08 || Math.abs(storeTime / max - expectedRatio) < 0.12;
        log(`CHECK seek click accurate (±8%)=${seekAccurate}`);
      }
    } else {
      log("WARN: no seek input found");
    }

    // Bar metadata click should NOT toggle play
    const meta = page.locator(".spotify-player-meta").first();
    if ((await meta.count()) > 0) {
      const playingBefore = (await dump()).store as { isPlaying?: boolean };
      await meta.click({ force: true });
      await page.waitForTimeout(800);
      const playingAfter = (await dump()).store as { isPlaying?: boolean };
      log(`INFO: meta click isPlaying before=${playingBefore.isPlaying} after=${playingAfter.isPlaying}`);
      log(`CHECK meta click no toggle=${playingBefore.isPlaying === playingAfter.isPlaying}`);
    }

    // Row click while playing active track toggles pause
    const playingBeforeRow = (await dump()).store as { isPlaying?: boolean };
    await row.click();
    await page.waitForTimeout(800);
    const playingAfterRow = (await dump()).store as { isPlaying?: boolean };
    log(`INFO: row click isPlaying before=${playingBeforeRow.isPlaying} after=${playingAfterRow.isPlaying}`);
    log(`CHECK row click toggles when active=${playingBeforeRow.isPlaying !== playingAfterRow.isPlaying}`);

    // Click bar area overlapping bottom - elementsFromPoint
    const barHit = await page.evaluate(() => {
      const bar = document.querySelector("[data-audio-player]");
      if (!bar) return null;
      const r = bar.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const top = document.elementsFromPoint(x, y)[0];
      return {
        inBar: !!top?.closest("[data-audio-player]"),
        tag: top?.tagName,
        className: (top as HTMLElement)?.className?.slice(0, 60),
      };
    });
    log(`INFO: bar center hit test=${JSON.stringify(barHit)}`);
  } catch (err) {
    log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await browser.close();
  }

  const failed = findings.filter((f) => f.startsWith("CHECK ") && f.endsWith("=false"));
  console.log("\n--- SUMMARY ---");
  console.log(`Checks failed: ${failed.length}`);
  for (const f of failed) console.log(f);
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
