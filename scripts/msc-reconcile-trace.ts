/**
 * Capture [MSC-RECONCILE] logs during play + seek.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/msc-reconcile-trace.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), "reports/msc-reconcile-trace.md");

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs: { tMs: number; text: string }[] = [];
  const t0 = Date.now();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[MSC-RECONCILE]")) logs.push({ tMs: Date.now() - t0, text });
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:msc-reconcile-trace", "1");
  });

  await page.goto(`${BASE_URL}/artists/sara-landry`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator('[id^="track-"]').first().click();
  await page.waitForTimeout(5000);
  await page.waitForSelector(".sb-slider", { timeout: 15000 });

  logs.push({ tMs: Date.now() - t0, text: "=== MARKER: pause ===" });
  await page.locator(".sb-pause").click();
  await page.waitForTimeout(1000);

  logs.push({ tMs: Date.now() - t0, text: "=== MARKER: resume ===" });
  await page.locator(".sb-play").click();
  await page.waitForTimeout(1500);

  logs.push({ tMs: Date.now() - t0, text: "=== MARKER: seek 50% ===" });
  const box = await page.locator(".sb-slider").boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.waitForTimeout(2000);
  }

  await browser.close();

  const preserved = logs.filter((l) => l.text.includes("PRESERVED non-engine"));
  const skipPatch = logs.filter((l) => l.text.includes("SKIP_PATCH"));
  const pendingBranch = logs.filter((l) => l.text.includes("pendingSeekSeconds !== null"));
  const mismatch = logs.filter((l) => l.text.includes("POST-RECONCILE MISMATCH"));

  const md = [
    "# MSC Reconcile Trace",
    "",
    `Captured: ${logs.length} lines`,
    "",
    "## Summary",
    "",
    `- PRESERVED non-engine: ${preserved.length}`,
    `- SKIP_PATCH: ${skipPatch.length}`,
    `- pendingSeekSeconds branch: ${pendingBranch.length}`,
    `- POST-RECONCILE MISMATCH: ${mismatch.length}`,
    "",
    "## First PRESERVED non-engine event",
    "",
    preserved[0] ? `- t+${preserved[0].tMs}ms ${preserved[0].text.slice(0, 300)}` : "_none_",
    "",
    "## First SKIP_PATCH (engine differs)",
    "",
    skipPatch.find((l) => l.text.includes("engine.currentTime differs"))
      ? `- ${skipPatch.find((l) => l.text.includes("engine.currentTime differs"))!.text.slice(0, 400)}`
      : "_none_",
    "",
    "## Full log",
    "",
    ...logs.map((l) => `- t+${String(l.tMs).padStart(5)}ms ${l.text.replace(/\n/g, " ")}`),
  ];

  writeFileSync(OUT, md.join("\n"));
  console.log(`Wrote ${OUT}`);
  console.log(`PRESERVED: ${preserved.length}, SKIP_PATCH: ${skipPatch.length}, MISMATCH: ${mismatch.length}`);
  if (preserved[0]) console.log("FIRST PRESERVED:", preserved[0].text.slice(0, 200));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
