/**
 * Queue / next / prev pipeline runtime audit — evidence capture only.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/queue-pipeline-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_JSON = join(process.cwd(), "reports/queue-pipeline-audit.json");
const OUT_MD = join(process.cwd(), "reports/queue-pipeline-audit.md");

interface TraceEntry {
  tMs: number;
  detail: Record<string, unknown>;
}

async function sample(page: import("playwright").Page, label: string): Promise<Record<string, unknown>> {
  return page.evaluate((l) => {
    const w = window as Window & { __queueTraceSample?: (label?: string) => Record<string, unknown> };
    return w.__queueTraceSample?.(l) ?? { error: "hook missing" };
  }, label);
}

function diverged(sample: Record<string, unknown>): string | null {
  const msc = sample.msc as { activeTrack?: string | null; queueIndex?: number } | undefined;
  const engine = sample.engine as { activeTrack?: string | null } | undefined;
  const store = sample.store as { activeTrack?: string | null; queueIndex?: number } | undefined;
  const snap = sample.snapshot as { activeTrack?: string | null; queueIndex?: number } | undefined;
  if (!msc || !engine || !store || !snap) return null;
  const refs = [msc.activeTrack, engine.activeTrack, store.activeTrack, snap.activeTrack];
  const uniqueRefs = new Set(refs.filter(Boolean));
  if (uniqueRefs.size > 1) return `activeTrack diverged: ${refs.join(" | ")}`;
  const idx = [msc.queueIndex, store.queueIndex, snap.queueIndex];
  if (new Set(idx).size > 1) return `queueIndex diverged: ${idx.join(" | ")}`;
  return null;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const entries: TraceEntry[] = [];
  const samples: Array<{ label: string; tMs: number; data: Record<string, unknown>; divergence: string | null }> = [];
  const t0 = Date.now();

  page.on("console", async (msg) => {
    const text = msg.text();
    if (!text.includes("[QUEUE-TRACE]")) return;
    let detail: Record<string, unknown> = { text };
    try {
      const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => null)));
      if (args.length >= 2 && args[1] && typeof args[1] === "object") {
        detail = args[1] as Record<string, unknown>;
      }
    } catch {
      // keep text
    }
    entries.push({ tMs: Date.now() - t0, detail });
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:queue-trace", "1");
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

  // Build queue: play first track (queue from browse context)
  await page.locator('[id^="track-"]').first().click();
  await page.waitForTimeout(5000);
  await page.waitForSelector(".sb-slider", { timeout: 20000 });
  samples.push({
    label: "after-initial-play",
    tMs: Date.now() - t0,
    data: await sample(page, "after-initial-play"),
    divergence: null,
  });
  samples[samples.length - 1].divergence = diverged(samples[samples.length - 1].data);

  // Next
  await page.evaluate(() => {
    const w = window as Window & { __queueAudit?: { next: () => void } };
    w.__queueAudit?.next();
  });
  await page.waitForTimeout(6000);
  samples.push({
    label: "after-next",
    tMs: Date.now() - t0,
    data: await sample(page, "after-next"),
    divergence: null,
  });
  samples[samples.length - 1].divergence = diverged(samples[samples.length - 1].data);

  // Next again
  await page.evaluate(() => {
    const w = window as Window & { __queueAudit?: { next: () => void } };
    w.__queueAudit?.next();
  });
  await page.waitForTimeout(6000);
  samples.push({
    label: "after-second-next",
    tMs: Date.now() - t0,
    data: await sample(page, "after-second-next"),
    divergence: null,
  });
  samples[samples.length - 1].divergence = diverged(samples[samples.length - 1].data);

  // Prev (likely restart if currentTime > 3)
  await page.evaluate(() => {
    const w = window as Window & { __queueAudit?: { prev: () => void } };
    w.__queueAudit?.prev();
  });
  await page.waitForTimeout(2000);
  samples.push({
    label: "after-prev-restart-or-back",
    tMs: Date.now() - t0,
    data: await sample(page, "after-prev"),
    divergence: null,
  });
  samples[samples.length - 1].divergence = diverged(samples[samples.length - 1].data);

  // Seek to start then prev to go back in queue
  await page.evaluate(() => {
    const w = window as Window & { __queueAudit?: { seekToStart: () => void; prev: () => void } };
    w.__queueAudit?.seekToStart();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const w = window as Window & { __queueAudit?: { prev: () => void } };
    w.__queueAudit?.prev();
  });
  await page.waitForTimeout(6000);
  samples.push({
    label: "after-prev-from-start",
    tMs: Date.now() - t0,
    data: await sample(page, "after-prev-from-start"),
    divergence: null,
  });
  samples[samples.length - 1].divergence = diverged(samples[samples.length - 1].data);

  // Auto-advance simulation
  await page.evaluate(() => {
    const w = window as Window & { __queueAudit?: { advanceOnEnd: () => void } };
    w.__queueAudit?.advanceOnEnd();
  });
  await page.waitForTimeout(6000);
  samples.push({
    label: "after-auto-advance",
    tMs: Date.now() - t0,
    data: await sample(page, "after-auto-advance"),
    divergence: null,
  });
  samples[samples.length - 1].divergence = diverged(samples[samples.length - 1].data);

  // Navigation
  await page.goto(`${BASE_URL}/discover`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  samples.push({
    label: "after-navigate",
    tMs: Date.now() - t0,
    data: await sample(page, "after-navigate"),
    divergence: null,
  });
  samples[samples.length - 1].divergence = diverged(samples[samples.length - 1].data);

  await browser.close();

  const duplicatePlays = entries.filter((e) => e.detail.duplicatePlay === true);
  const firstDivergence = samples.find((s) => s.divergence);

  const report = {
    generatedAt: new Date().toISOString(),
    entries,
    samples,
    duplicatePlayCount: duplicatePlays.length,
    firstDivergence,
  };

  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  const md = [
    "# Queue Pipeline Runtime Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Samples",
    "",
    ...samples.map(
      (s) =>
        `### ${s.label} (t+${s.tMs}ms)${s.divergence ? ` — **DIVERGENCE: ${s.divergence}**` : ""}\n\n\`\`\`json\n${JSON.stringify(s.data, null, 2)}\n\`\`\``,
    ),
    "",
    "## Navigation events",
    "",
    ...entries
      .filter((e) => {
        const fn = String(e.detail.fn ?? "");
        const phase = String(e.detail.phase ?? "");
        return (
          fn.includes("next") ||
          fn.includes("prev") ||
          fn.includes("advanceQueueOnEnd") ||
          fn.includes("MediaSessionController.play") ||
          (fn.includes("ProviderRouter.play") && (phase === "enter" || phase === "playback_confirmed")) ||
          (fn.includes("onEngineSnapshot") && e.detail.trackChanged === true) ||
          fn.includes("applyReconciledTransport")
        );
      })
      .slice(0, 60)
      .map((e) => `- t+${e.tMs}ms \`${e.detail.fn}\` ${e.detail.phase} ${JSON.stringify(e.detail).slice(0, 320)}`),
    "",
    `Duplicate play() within 500ms: **${duplicatePlays.length}**`,
    firstDivergence ? `\nFirst sample divergence: **${firstDivergence.label}** — ${firstDivergence.divergence}` : "\nNo sample divergence detected.",
  ].join("\n");

  writeFileSync(OUT_MD, md);
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Entries: ${entries.length}, divergences: ${samples.filter((s) => s.divergence).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
