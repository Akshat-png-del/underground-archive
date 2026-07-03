/**
 * Phase 9 — Runtime state synchronization audit.
 *
 * Usage (dev server running):
 *   BASE_URL=http://localhost:3000 npx tsx scripts/playback-sync-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REPORT_JSON = join(process.cwd(), "reports/playback-sync-audit.json");
const REPORT_MD = join(process.cwd(), "reports/playback-sync-audit.md");

type SampleResult = {
  action: string;
  tMs: number;
  layers: Record<string, unknown>;
  divergence: Record<string, unknown> | null;
};

async function sample(page: import("playwright").Page, action: string): Promise<SampleResult> {
  const tMs = Date.now();
  const result = await page.evaluate((act) => {
    const w = window as Window & { __syncAuditSample?: (a?: string) => Record<string, unknown> };
    return w.__syncAuditSample?.(act) ?? { error: "hook missing" };
  }, action);
  return {
    action,
    tMs,
    layers: result as Record<string, unknown>,
    divergence: (result.divergence as Record<string, unknown> | null) ?? null,
  };
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const syncLogs: { tMs: number; text: string }[] = [];
  const t0 = Date.now();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[SYNC-AUDIT]")) {
      syncLogs.push({ tMs: Date.now() - t0, text });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:sync-audit", "1");
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

  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const samples: SampleResult[] = [];

  // play
  await page.locator('[id^="track-"]').first().click();
  await page.waitForTimeout(5000);
  await page.waitForSelector(".sb-slider", { timeout: 15000 });
  samples.push(await sample(page, "after-play"));

  // pause
  await page.locator('[data-player-play-pause="true"].sb-pause').click();
  await page.waitForTimeout(800);
  samples.push(await sample(page, "after-pause"));

  // resume
  await page.locator('[data-player-play-pause="true"].sb-play').click();
  await page.waitForTimeout(1500);
  samples.push(await sample(page, "after-resume"));

  // seek 50%
  const box = await page.locator(".sb-slider").boundingBox();
  if (box) {
    const x = box.x + box.width * 0.5;
    const y = box.y + box.height / 2;
    await page.mouse.click(x, y);
    await page.waitForTimeout(1200);
    samples.push(await sample(page, "after-seek-50pct"));
  }

  // next (if enabled)
  const nextBtn = page.locator('[aria-label="Next"]');
  if ((await nextBtn.count()) > 0 && (await nextBtn.getAttribute("aria-disabled")) !== "true") {
    await nextBtn.click();
    await page.waitForTimeout(3000);
    samples.push(await sample(page, "after-next"));
  }

  // previous
  const prevBtn = page.locator('[aria-label="Previous"]');
  if ((await prevBtn.count()) > 0) {
    await prevBtn.click();
    await page.waitForTimeout(1500);
    samples.push(await sample(page, "after-prev"));
  }

  // volume (only if preview — spotify shows disabled)
  const volSlider = page.locator(".player-volume-slider");
  if ((await volSlider.count()) > 0 && !(await volSlider.isDisabled())) {
    await volSlider.fill("0.5");
    await page.waitForTimeout(500);
    samples.push(await sample(page, "after-volume"));
  } else {
    samples.push(await sample(page, "volume-skipped-spotify"));
  }

  await browser.close();

  const divergences = samples.filter((s) => s.divergence);

  const md = [
    "# Playback Sync Audit — Runtime",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Actions sampled",
    "",
    ...samples.map(
      (s) =>
        `- **${s.action}** @ t+${s.tMs - t0}ms${s.divergence ? " — **DIVERGENCE**" : " — aligned"}`,
    ),
    "",
    "## First divergences per action",
    "",
    ...(divergences.length
      ? divergences.map(
          (s) =>
            `### ${s.action}\n\n\`\`\`json\n${JSON.stringify(s.divergence, null, 2)}\n\`\`\`\n`,
        )
      : ["_No cross-layer divergences detected in sampled actions._"]),
    "",
    "## Layer samples (last action)",
    "",
    "```json",
    JSON.stringify(samples[samples.length - 1]?.layers ?? {}, null, 2),
    "```",
    "",
    "## Console sync logs (last 40)",
    "",
    ...syncLogs.slice(-40).map((l) => `- t+${l.tMs}ms ${l.text.slice(0, 200)}`),
  ];

  writeFileSync(REPORT_JSON, JSON.stringify({ samples, syncLogs, divergences }, null, 2));
  writeFileSync(REPORT_MD, md.join("\n"));

  console.log(`Report: ${REPORT_MD}`);
  console.log(`Samples: ${samples.length}, divergences: ${divergences.length}`);
  for (const d of divergences) {
    console.log(`DIVERGENCE ${d.action}:`, JSON.stringify(d.divergence));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
