/**
 * Volume pipeline runtime audit — evidence capture only.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/volume-pipeline-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_JSON = join(process.cwd(), "reports/volume-pipeline-audit.json");
const OUT_MD = join(process.cwd(), "reports/volume-pipeline-audit.md");

interface TraceEntry {
  tMs: number;
  text: string;
  detail: Record<string, unknown>;
}

async function sample(page: import("playwright").Page, label: string): Promise<Record<string, unknown>> {
  return page.evaluate((l) => {
    const w = window as Window & { __volumeTraceSample?: (label?: string) => Record<string, unknown> };
    return w.__volumeTraceSample?.(l) ?? { error: "hook missing" };
  }, label);
}

function parseTraceDetail(text: string): Record<string, unknown> {
  const brace = text.indexOf("{");
  if (brace === -1) return { text };
  try {
    return JSON.parse(text.slice(brace)) as Record<string, unknown>;
  } catch {
    return { text };
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const entries: TraceEntry[] = [];
  const samples: Array<{ label: string; tMs: number; data: Record<string, unknown> }> = [];
  const t0 = Date.now();

  page.on("console", async (msg) => {
    const text = msg.text();
    if (!text.includes("[VOLUME-TRACE]")) return;
    let detail: Record<string, unknown> = { text };
    try {
      const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => null)));
      if (args.length >= 2 && args[1] && typeof args[1] === "object") {
        detail = args[1] as Record<string, unknown>;
      } else {
        detail = parseTraceDetail(text);
      }
    } catch {
      detail = parseTraceDetail(text);
    }
    entries.push({ tMs: Date.now() - t0, text, detail });
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:volume-trace", "1");
    localStorage.setItem("vf:playback-debug", "1");
    localStorage.setItem(
      "underground-archive-preferences-v1",
      JSON.stringify({
        favoriteArtists: [],
        favoriteGenres: [],
        favoriteMoods: [],
        bpmRange: [130, 150],
        completedAt: new Date().toISOString(),
      }),
    );
  });

  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  await page.locator('[id^="track-"]').first().click();
  await page.waitForTimeout(5000);
  await page.waitForSelector(".sb-slider", { timeout: 20000 });
  samples.push({ label: "after-spotify-play", tMs: Date.now() - t0, data: await sample(page, "after-spotify-play") });

  await page.evaluate(() => {
    const w = window as Window & { __volumeAudit?: { setVolume: (v: number) => void } };
    w.__volumeAudit?.setVolume(0.35);
  });
  await page.waitForTimeout(400);
  samples.push({
    label: "after-msc-setVolume-0.35-on-spotify",
    tMs: Date.now() - t0,
    data: await sample(page, "after-msc-setVolume-spotify"),
  });

  await page.evaluate(() => {
    const w = window as Window & { __volumeAudit?: { toggleMute: () => void } };
    w.__volumeAudit?.toggleMute();
  });
  await page.waitForTimeout(400);
  samples.push({
    label: "after-msc-toggleMute-on-spotify",
    tMs: Date.now() - t0,
    data: await sample(page, "after-msc-toggleMute-spotify"),
  });

  await page.evaluate(() => {
    const w = window as Window & {
      __volumeAudit?: { setVolume: (v: number) => void; playPreview: () => void };
    };
    w.__volumeAudit?.setVolume(0.42);
    w.__volumeAudit?.playPreview();
  });
  await page.waitForTimeout(6000);
  samples.push({
    label: "after-preview-play-volume-0.42",
    tMs: Date.now() - t0,
    data: await sample(page, "after-preview-play"),
  });

  await page.evaluate(() => {
    const w = window as Window & { __volumeAudit?: { setVolume: (v: number) => void } };
    w.__volumeAudit?.setVolume(0.15);
  });
  await page.waitForTimeout(500);
  samples.push({
    label: "after-preview-setVolume-0.15",
    tMs: Date.now() - t0,
    data: await sample(page, "after-preview-setVolume"),
  });

  const volumeSlider = page.locator(".player-volume-slider");
  if (await volumeSlider.count()) {
    await volumeSlider.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = "0.65";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(500);
    samples.push({ label: "after-ui-slider-0.65", tMs: Date.now() - t0, data: await sample(page, "after-ui-slider") });
  }

  await page.evaluate(() => {
    const w = window as Window & { __volumeAudit?: { toggleMute: () => void } };
    w.__volumeAudit?.toggleMute();
  });
  await page.waitForTimeout(400);
  samples.push({
    label: "after-preview-toggleMute",
    tMs: Date.now() - t0,
    data: await sample(page, "after-preview-toggleMute"),
  });

  await page.goto(`${BASE_URL}/discover`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  samples.push({ label: "after-navigate-discover", tMs: Date.now() - t0, data: await sample(page, "after-navigate") });

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    entries,
    samples,
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = [
    "# Volume Pipeline Runtime Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Samples",
    "",
    ...samples.map(
      (s) =>
        `### ${s.label} (t+${s.tMs}ms)\n\n\`\`\`json\n${JSON.stringify(s.data, null, 2)}\n\`\`\``,
    ),
    "",
    "## Key trace events",
    "",
    ...entries
      .filter((e) => {
        const fn = String(e.detail.fn ?? "");
        return (
          fn.includes("setVolume") ||
          fn.includes("setMuted") ||
          fn.includes("toggleMute") ||
          fn.includes("applyVolumeToEngine") ||
          fn.includes("AudioProvider.init") ||
          fn.includes("ProviderRouter.setVolume")
        );
      })
      .slice(0, 50)
      .map((e) => `- t+${e.tMs}ms \`${e.detail.fn}\` ${e.detail.phase} ${JSON.stringify(e.detail).slice(0, 280)}`),
  ].join("\n");

  writeFileSync(OUT_MD, md);
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Entries: ${entries.length}, samples: ${samples.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
