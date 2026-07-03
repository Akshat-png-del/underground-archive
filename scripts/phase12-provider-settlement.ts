/**
 * Phase 12 — Provider seek settlement runtime capture (read-only, no app changes).
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/phase12-provider-settlement.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_MD = join(process.cwd(), "reports/phase12-provider-settlement.md");
const OUT_JSON = join(process.cwd(), "reports/phase12-provider-settlement.json");
const CAPTURE_MS = 5000;
const TOLERANCE = 0.25;

interface LogLine {
  tMs: number;
  text: string;
}

function parseObj(text: string): Record<string, unknown> {
  const brace = text.indexOf("{");
  if (brace === -1) return {};
  const inner = text.slice(brace + 1, text.lastIndexOf("}"));
  const out: Record<string, unknown> = {};
  const re = /(\w+):\s*([^,}]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    const key = m[1];
    const raw = m[2].trim();
    if (raw === "null") out[key] = null;
    else if (raw === "true") out[key] = true;
    else if (raw === "false") out[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(raw)) out[key] = Number(raw);
    else out[key] = raw;
  }
  return out;
}

interface SettlementTick {
  tick: number;
  tMs: number;
  source: string;
  providerCurrentTime: number | null;
  engineCurrentTime: number | null;
  mscTransportCurrentTime: number | null;
  mscTransportAfter: number | null;
  pendingSeekSeconds: number | null;
  seekLockActive: boolean | null;
  accept: boolean | null;
  clearPending: boolean | null;
  clearPendingSeek: boolean | null;
  currentTimeBranch: string | null;
  raw: string;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const logs: LogLine[] = [];
  const t0 = Date.now();

  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("[MSC-RECONCILE]") ||
      text.includes("[SYNC-AUDIT]") ||
      text.includes("[TRACE] MediaSessionController.commitSeek EXIT") ||
      text.includes("[SESSION] commitSeek")
    ) {
      logs.push({ tMs: Date.now() - t0, text });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:msc-reconcile-trace", "1");
    localStorage.setItem("vf:sync-audit", "1");
    localStorage.setItem("vf:seek-trace", "1");
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
  await page.waitForTimeout(6000);
  await page.waitForSelector(".sb-slider", { timeout: 20000 });

  const box = await page.locator(".sb-slider").boundingBox();
  if (!box) throw new Error("slider not found");
  const y = box.y + box.height / 2;
  const endX = box.x + box.width * 0.55;

  await page.mouse.move(box.x + 8, y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.move(endX, y, { steps: 12 });
  await page.waitForTimeout(120);
  await page.mouse.up();

  const commitExit = logs.find((l) => l.text.includes("MediaSessionController.commitSeek EXIT"));
  if (!commitExit) throw new Error("commitSeek EXIT not observed");

  const seekTargetObj = parseObj(commitExit.text);
  const seekTarget = typeof seekTargetObj.target === "number" ? seekTargetObj.target : 16;

  await page.waitForTimeout(CAPTURE_MS);

  const post = await page.evaluate(() => {
    const w = window as Window & { __seekReproSample?: () => Record<string, unknown> };
    return w.__seekReproSample?.() ?? null;
  });

  await browser.close();

  const anchorTMs = commitExit.tMs;
  const windowLogs = logs.filter((l) => l.tMs >= anchorTMs && l.tMs <= anchorTMs + CAPTURE_MS);

  const ticks: SettlementTick[] = [];
  let tick = 0;
  const providerByT = new Map<number, number>();
  for (const l of windowLogs) {
    if (!l.text.includes("[SYNC-AUDIT]")) continue;
    const o = parseObj(l.text);
    if (o.layer === "provider" && typeof o.currentTime === "number") {
      providerByT.set(l.tMs, o.currentTime);
    }
  }

  const reconcileEnters = windowLogs.filter((l) =>
    l.text.includes("[MSC-RECONCILE] onEngineSnapshot ENTER"),
  );

  for (const enter of reconcileEnters) {
    tick += 1;
    const enterObj = parseObj(enter.text);
    const idx = reconcileEnters.indexOf(enter);
    const endT = reconcileEnters[idx + 1]?.tMs ?? enter.tMs + 2000;
    const slice = windowLogs.filter((l) => l.tMs >= enter.tMs && l.tMs < endT);

    let accept: boolean | null = null;
    let clearPending: boolean | null = null;
    let clearPendingSeek: boolean | null = null;
    let inSeekLock: boolean | null = null;
    let branch: string | null = null;
    let transportAfter: number | null = null;
    let clearPendingSeekFired = false;

    for (const line of slice) {
      const o = parseObj(line.text);
      if (line.text.includes("shouldAcceptPositionAfterSeek")) {
        if (typeof o.accept === "boolean") accept = o.accept;
        if (typeof o.clearPending === "boolean") clearPending = o.clearPending;
        if (typeof o.clearPendingSeek === "boolean") clearPendingSeek = o.clearPendingSeek;
      }
      if (line.text.includes("seek flags") && typeof o.inSeekLock === "boolean") {
        inSeekLock = o.inSeekLock;
      }
      if (line.text.includes("currentTime assignment") && o.branch) {
        branch = String(o.branch);
      }
      if (line.text.includes("onEngineSnapshot EXIT")) {
        transportAfter =
          typeof o.transportCurrentTimeAfter === "number" ? o.transportCurrentTimeAfter : transportAfter;
      }
      if (line.text.includes("reconcileEngineSnapshot EXIT")) {
        if (typeof o.transportCurrentTimeAfter === "number") transportAfter = o.transportCurrentTimeAfter;
        if (typeof o.clearPendingSeek === "boolean") clearPendingSeek = o.clearPendingSeek;
      }
      if (line.text.includes("condition: clearPendingSeek")) clearPendingSeekFired = true;
    }

    const engineTime =
      typeof enterObj.engineCurrentTime === "number" ? enterObj.engineCurrentTime : null;
    const transportBefore =
      typeof enterObj.transportCurrentTimeBefore === "number"
        ? enterObj.transportCurrentTimeBefore
        : null;

    let providerTime: number | null = null;
    for (const [t, pt] of providerByT) {
      if (Math.abs(t - enter.tMs) <= 100) providerTime = pt;
    }
    if (providerTime === null) providerTime = engineTime;

    ticks.push({
      tick,
      tMs: enter.tMs - anchorTMs,
      source: "onEngineSnapshot",
      providerCurrentTime: providerTime,
      engineCurrentTime: engineTime,
      mscTransportCurrentTime: transportBefore,
      mscTransportAfter: transportAfter,
      pendingSeekSeconds:
        enterObj.pendingSeekSeconds === null
          ? null
          : typeof enterObj.pendingSeekSeconds === "number"
            ? enterObj.pendingSeekSeconds
            : null,
      seekLockActive: inSeekLock,
      accept,
      clearPending,
      clearPendingSeek: clearPendingSeekFired ? true : clearPendingSeek,
      currentTimeBranch: branch,
      raw: enter.text.slice(0, 200),
    });
  }

  for (const [tMs, pt] of providerByT) {
    if (reconcileEnters.some((e) => Math.abs(e.tMs - tMs) <= 100)) continue;
    tick += 1;
    ticks.push({
      tick,
      tMs: tMs - anchorTMs,
      source: "provider-only",
      providerCurrentTime: pt,
      engineCurrentTime: null,
      mscTransportCurrentTime: null,
      mscTransportAfter: null,
      pendingSeekSeconds: null,
      seekLockActive: null,
      accept: null,
      clearPending: null,
      clearPendingSeek: null,
      currentTimeBranch: null,
      raw: `provider tick t+${tMs - anchorTMs}ms`,
    });
  }

  ticks.sort((a, b) => a.tMs - b.tMs);
  ticks.forEach((t, i) => {
    t.tick = i + 1;
  });

  const withinTolerance = ticks.filter(
    (t) =>
      t.engineCurrentTime !== null &&
      Math.abs(t.engineCurrentTime - seekTarget) <= TOLERANCE,
  );
  const providerWithinTolerance = ticks.filter(
    (t) =>
      t.providerCurrentTime !== null &&
      Math.abs(t.providerCurrentTime - seekTarget) <= TOLERANCE,
  );

  const anyClearPendingSeek = windowLogs.some((l) => l.text.includes("condition: clearPendingSeek"));
  const lastPending = [...ticks].reverse().find((t) => t.pendingSeekSeconds !== null);
  const finalPending = post
    ? (post as { controller?: { currentTime?: number } }).controller
    : null;

  const duration =
    post && typeof post === "object" && "engine" in post
      ? ((post as { engine?: { duration?: number } }).engine?.duration ?? null)
      : null;

  const maxProviderTime = Math.max(
    ...ticks.map((t) => t.providerCurrentTime ?? 0),
    0,
  );

  const md = [
    "# Phase 12 — Provider Seek Settlement",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Seek target: **${seekTarget}s** (tolerance ±${TOLERANCE}s)`,
    `Capture window: **${CAPTURE_MS}ms** after commitSeek EXIT`,
    "",
    "## Timeline",
    "",
    "| Tick | t+ms | provider | engine | MSC before | MSC after | pendingSeek | seekLock | accept | clearPending | clearPendingSeek | branch |",
    "|------|------|----------|--------|------------|-----------|-------------|----------|--------|--------------|------------------|--------|",
  ];

  for (const t of ticks) {
    md.push(
      `| ${t.tick} | ${t.tMs} | ${t.providerCurrentTime ?? "—"} | ${t.engineCurrentTime ?? "—"} | ${t.mscTransportCurrentTime ?? "—"} | ${t.mscTransportAfter ?? "—"} | ${t.pendingSeekSeconds ?? "null"} | ${t.seekLockActive ?? "—"} | ${t.accept ?? "—"} | ${t.clearPending ?? "—"} | ${t.clearPendingSeek ?? "—"} | ${(t.currentTimeBranch ?? "—").replace(/\|/g, "/").slice(0, 40)} |`,
    );
  }

  md.push("", "## Explicit answers", "");

  if (providerWithinTolerance.length > 0 || withinTolerance.length > 0) {
    const first = providerWithinTolerance[0] ?? withinTolerance[0];
    md.push(
      `**Does Spotify report position within tolerance of ${seekTarget}s?** YES`,
      "",
      `- First tick: **${first.tick}** @ t+${first.tMs}ms`,
      `- provider.currentTime: **${first.providerCurrentTime}**, engine: **${first.engineCurrentTime}**`,
      `- pendingSeekSeconds at that tick: **${first.pendingSeekSeconds ?? "null"}**`,
      `- clearPendingSeek fired: **${first.clearPendingSeek ?? false}**`,
      `- Why pending ${first.clearPendingSeek ? "was cleared" : "was NOT cleared"}: ${
        first.clearPendingSeek
          ? "shouldAcceptPositionAfterSeek matched target and seek lock had expired"
          : first.seekLockActive
            ? "seek lock still active (Phase 11 gate blocks clearPendingSeek)"
            : first.clearPending === false
              ? "shouldAcceptPositionAfterSeek returned clearPending:false (position not matched or stale)"
              : "clearPendingSeek gate false despite position match"
      }`,
    );
  } else {
    md.push(
      `**Does Spotify report position within tolerance of ${seekTarget}s?** NO (within ${CAPTURE_MS}ms window)`,
      "",
      `Observed provider/engine positions: ${[...new Set(ticks.map((t) => t.engineCurrentTime ?? t.providerCurrentTime).filter((v) => v !== null))].join(", ")}`,
      "",
    );
    if (duration !== null && maxProviderTime >= duration - 1) {
      md.push("- Provider appears to jump **near end of track** (max observed vs duration).");
    } else if (ticks.some((t) => (t.engineCurrentTime ?? 0) > seekTarget + 5)) {
      md.push(
        `- Provider **overshoots** seek target (e.g. reports ~${maxProviderTime}s vs target ${seekTarget}s) — not end-of-track, not restart.`,
      );
    } else {
      md.push("- Provider reports **stale pre-seek or unrelated positions** — seek command sent but position reports do not converge to target in window.");
    }
  }

  md.push(
    "",
    `**Does controller remain permanently in pending-seek state?** ${
      lastPending && !anyClearPendingSeek && ticks[ticks.length - 1]?.pendingSeekSeconds !== null
        ? "YES — pendingSeekSeconds still set at end of capture window"
        : anyClearPendingSeek
          ? "NO — clearPendingSeek fired during window"
          : ticks.every((t) => t.pendingSeekSeconds === null || t.pendingSeekSeconds === undefined)
            ? "NO — pendingSeekSeconds was null on all observed reconcile ticks after commit"
            : `INCONCLUSIVE — pendingSeekSeconds=${lastPending?.pendingSeekSeconds ?? "?"} at last tick with pending set; no clearPendingSeek in window`
    }`,
    "",
    "**Code paths that can leave pendingSeekSeconds uncleared indefinitely (static, for context):**",
    "- `pendingSeekDeadline` (3000ms): `shouldAcceptPositionAfterSeek` returns `clearPending: true` on deadline expiry regardless of position match",
    "- `clearSeekState()` on stop/navigation clears pending",
    "- Phase 11 gate: `clearPendingSeek = clearPending && !inSeekLock` — blocks clear during 300ms lock only",
    "",
    `**Runtime: pending uncleared after ${CAPTURE_MS}ms?** ${
      anyClearPendingSeek
        ? "NO — clearPendingSeek event observed"
        : ticks.filter((t) => t.pendingSeekSeconds === seekTarget).length > 0
          ? `YES — pendingSeekSeconds remained ${seekTarget} for all reconcile ticks; no clearPendingSeek in window (provider never reported target within tolerance after lock)`
          : "NO or N/A"
    }`,
    "",
    "## Post-capture sample",
    "",
    "```json",
    JSON.stringify(post, null, 2),
    "```",
  );

  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seekTarget,
        captureMs: CAPTURE_MS,
        ticks,
        anyClearPendingSeek,
        withinTolerance,
        providerWithinTolerance,
        post,
        windowLogs: windowLogs.map((l) => l.text),
      },
      null,
      2,
    ),
  );
  writeFileSync(OUT_MD, md.join("\n"));

  console.log(`Wrote ${OUT_MD}`);
  console.log(`Ticks: ${ticks.length}, withinTolerance: ${withinTolerance.length}, clearPendingSeek: ${anyClearPendingSeek}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
