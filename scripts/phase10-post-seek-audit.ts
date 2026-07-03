/**
 * Phase 10 — First 10 onEngineSnapshot callbacks after committed drag seek.
 * Uses existing [MSC-RECONCILE] + [TRACE] logs only.
 *
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/phase10-post-seek-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_MD = join(process.cwd(), "reports/phase10-post-seek-audit.md");
const OUT_JSON = join(process.cwd(), "reports/phase10-post-seek-audit.json");

interface LogLine {
  tMs: number;
  text: string;
}

function parseConsoleObject(text: string): Record<string, unknown> {
  const brace = text.indexOf("{");
  if (brace === -1) return {};
  const inner = text.slice(brace + 1, text.lastIndexOf("}"));
  const out: Record<string, unknown> = {};
  const re = /(\w+):\s*([^,}]+(?:\{[^}]*\})?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    const key = m[1];
    let raw = m[2].trim();
    if (raw === "null") out[key] = null;
    else if (raw === "true") out[key] = true;
    else if (raw === "false") out[key] = false;
    else if (/^-?\d+(\.\d+)?$/.test(raw)) out[key] = Number(raw);
    else out[key] = raw.replace(/^['"]|['"]$/g, "");
  }
  return out;
}

interface ReconcileTick {
  tick: number;
  tMs: number;
  engineCurrentTime: number | null;
  transportBefore: number | null;
  transportAfter: number | null;
  pendingSeekSeconds: number | null;
  seekLockUntil: number | null;
  pendingSeekDeadline: number | null;
  isLoading: boolean | null;
  accept: boolean | null;
  clearPending: boolean | null;
  currentTimeBranch: string | null;
  patchAction: "PATCH" | "SKIP_PATCH" | null;
  patchReason: string | null;
  preservedNonEngine: boolean;
  preservedCondition: string | null;
  rawLines: string[];
}

function buildTicks(logs: LogLine[], afterTMs: number): ReconcileTick[] {
  const relevant = logs.filter(
    (l) => l.tMs >= afterTMs && l.text.includes("[MSC-RECONCILE] onEngineSnapshot ENTER"),
  );
  const ticks: ReconcileTick[] = [];

  for (let i = 0; i < Math.min(10, relevant.length); i++) {
    const enter = relevant[i];
    const enterObj = parseConsoleObject(enter.text);
    const endTMs =
      i + 1 < relevant.length ? relevant[i + 1].tMs : enter.tMs + 5000;
    const slice = logs.filter((l) => l.tMs >= enter.tMs && l.tMs < endTMs);
    const rawLines = slice.map((l) => l.text);

    let transportAfter: number | null = null;
    let accept: boolean | null = null;
    let clearPending: boolean | null = null;
    let currentTimeBranch: string | null = null;
    let patchAction: "PATCH" | "SKIP_PATCH" | null = null;
    let patchReason: string | null = null;
    let preservedNonEngine = false;
    let preservedCondition: string | null = null;
    let isLoading: boolean | null =
      typeof enterObj.engineIsLoading === "boolean" ? enterObj.engineIsLoading : null;

    for (const line of slice) {
      const o = parseConsoleObject(line.text);
      if (line.text.includes("reconcileEngineSnapshot GUARD") && line.text.includes("shouldAcceptPositionAfterSeek")) {
        if (typeof o.accept === "boolean") accept = o.accept;
        if (typeof o.clearPending === "boolean") clearPending = o.clearPending;
      }
      if (line.text.includes("reconcileEngineSnapshot BRANCH") && line.text.includes("currentTime assignment")) {
        currentTimeBranch = String(o.branch ?? null);
        if (o.preservedPriorTransport === true) {
          preservedNonEngine = true;
          preservedCondition = `currentTime assignment branch "${currentTimeBranch}" with preservedPriorTransport=true`;
        }
      }
      if (line.text.includes("PRESERVED non-engine time")) {
        preservedNonEngine = true;
        preservedCondition = String(o.condition ?? "PRESERVED non-engine time");
        if (o.currentTimeBranch) currentTimeBranch = String(o.currentTimeBranch);
      }
      if (line.text.includes("onEngineSnapshot EXIT")) {
        transportAfter = typeof o.transportCurrentTimeAfter === "number" ? o.transportCurrentTimeAfter : null;
        if (isLoading === null && typeof o.engineIsLoading === "boolean") isLoading = o.engineIsLoading;
      }
      if (line.text.includes("onEngineSnapshot PATCH")) patchAction = "PATCH";
      if (line.text.includes("onEngineSnapshot SKIP_PATCH")) {
        patchAction = "SKIP_PATCH";
        patchReason = String(o.reason ?? "");
        if (
          patchReason.includes("engine.currentTime differs") ||
          patchReason.includes("engine differs")
        ) {
          preservedNonEngine = true;
          preservedCondition = `SKIP_PATCH: ${patchReason}`;
        }
      }
      if (line.text.includes("reconcileEngineSnapshot EXIT") && transportAfter === null) {
        transportAfter =
          typeof o.transportCurrentTimeAfter === "number" ? o.transportCurrentTimeAfter : transportAfter;
      }
    }

    const engineTime =
      typeof enterObj.engineCurrentTime === "number" ? enterObj.engineCurrentTime : null;
    const transportBefore =
      typeof enterObj.transportCurrentTimeBefore === "number"
        ? enterObj.transportCurrentTimeBefore
        : null;

    if (
      engineTime !== null &&
      transportAfter !== null &&
      Math.abs(engineTime - transportAfter) > 0.05 &&
      !preservedNonEngine
    ) {
      preservedNonEngine = true;
      preservedCondition = `POST-RECONCILE: engine=${engineTime} transportAfter=${transportAfter}`;
    }

    ticks.push({
      tick: i + 1,
      tMs: enter.tMs,
      engineCurrentTime: engineTime,
      transportBefore,
      transportAfter,
      pendingSeekSeconds:
        enterObj.pendingSeekSeconds === null
          ? null
          : typeof enterObj.pendingSeekSeconds === "number"
            ? enterObj.pendingSeekSeconds
            : null,
      seekLockUntil:
        typeof enterObj.seekLockUntil === "number" ? enterObj.seekLockUntil : null,
      pendingSeekDeadline:
        typeof enterObj.pendingSeekDeadline === "number" ? enterObj.pendingSeekDeadline : null,
      isLoading,
      accept,
      clearPending,
      currentTimeBranch,
      patchAction,
      patchReason,
      preservedNonEngine,
      preservedCondition,
      rawLines,
    });
  }

  return ticks;
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
      text.includes("[TRACE]") ||
      text.includes("[SESSION]")
    ) {
      logs.push({ tMs: Date.now() - t0, text });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:msc-reconcile-trace", "1");
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

  const slider = page.locator(".sb-slider");
  const box = await slider.boundingBox();
  if (!box) throw new Error("seek slider not found");

  const y = box.y + box.height / 2;
  const startX = box.x + 8;
  const endX = box.x + box.width * 0.55;

  logs.push({ tMs: Date.now() - t0, text: "=== MARKER: drag seek start ===" });

  await page.mouse.move(startX, y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.move(endX, y, { steps: 12 });
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(12000);

  logs.push({ tMs: Date.now() - t0, text: "=== MARKER: drag seek end ===" });

  const post = await page.evaluate(() => {
    const w = window as Window & { __seekReproSample?: () => Record<string, unknown> };
    return w.__seekReproSample?.() ?? null;
  });

  await browser.close();

  const commitDragSeekExit = logs.find(
    (l) =>
      l.text.includes("[TRACE] PlaybackSeekBar.commitDragSeek EXIT") ||
      (l.text.includes("PlaybackSeekBar.commitDragSeek") && l.text.includes("EXIT")),
  );
  const commitSeekExit = logs.find(
    (l) =>
      l.text.includes("[TRACE] MediaSessionController.commitSeek EXIT") ||
      (l.text.includes("MediaSessionController.commitSeek") && l.text.includes("EXIT")),
  );
  const engineSeekExit = logs.find(
    (l) =>
      l.text.includes("[TRACE] GlobalPlayerEngine.seek EXIT") ||
      (l.text.includes("GlobalPlayerEngine.seek") && l.text.includes("EXIT")),
  );

  const commitDragSeekEnter = logs.some((l) => l.text.includes("PlaybackSeekBar.commitDragSeek") && l.text.includes("ENTER"));
  const commitSeekEnter = logs.some((l) => l.text.includes("MediaSessionController.commitSeek") && l.text.includes("ENTER"));
  const engineSeekEnter = logs.some((l) => l.text.includes("GlobalPlayerEngine.seek") && l.text.includes("ENTER"));

  const anchor = commitSeekExit ?? commitDragSeekExit;
  const ticks = anchor ? buildTicks(logs, anchor.tMs) : [];

  const firstDivergence = ticks.find((t) => t.preservedNonEngine);

  const md: string[] = [
    "# Phase 10 — First Post-Seek Engine Tick Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Seek pipeline verification",
    "",
    `| Step | Entered | Exited |`,
    `|------|---------|--------|`,
    `| PlaybackSeekBar.commitDragSeek | ${commitDragSeekEnter ? "yes" : "**NO**"} | ${commitDragSeekExit ? "yes" : "**NO**"} |`,
    `| MediaSessionController.commitSeek | ${commitSeekEnter ? "yes" : "**NO**"} | ${commitSeekExit ? "yes" : "**NO**"} |`,
    `| GlobalPlayerEngine.seek | ${engineSeekEnter ? "yes" : "**NO**"} | ${engineSeekExit ? "yes" : "**NO**"} |`,
    "",
  ];

  if (commitSeekExit) {
    const o = parseConsoleObject(commitSeekExit.text);
    md.push(`commitSeek EXIT @ t+${commitSeekExit.tMs}ms — target=${o.target}, pendingSeekSeconds=${o.pendingSeekSeconds}`);
  } else {
    md.push("_commitSeek EXIT not observed — drag seek may not have committed._");
  }

  md.push("", "## First 10 onEngineSnapshot callbacks after commitSeek EXIT", "");

  if (ticks.length === 0) {
    md.push("_No onEngineSnapshot callbacks captured after commitSeek EXIT._");
  } else {
    md.push(
      "| Tick | t+ms | engine.currentTime | transport BEFORE | transport AFTER | pendingSeekSeconds | accept | clearPending | branch | PATCH/SKIP |",
      "|------|------|-------------------|------------------|-----------------|-------------------|--------|--------------|--------|------------|",
    );
    for (const t of ticks) {
      md.push(
        `| ${t.tick} | ${t.tMs} | ${t.engineCurrentTime ?? "?"} | ${t.transportBefore ?? "?"} | ${t.transportAfter ?? "?"} | ${t.pendingSeekSeconds ?? "null"} | ${t.accept ?? "?"} | ${t.clearPending ?? "?"} | ${(t.currentTimeBranch ?? "?").replace(/\|/g, "/")} | ${t.patchAction ?? "?"} |`,
      );
    }

    md.push("", "### Per-tick detail", "");
    for (const t of ticks) {
      md.push(
        `#### Tick ${t.tick} (t+${t.tMs}ms)`,
        "",
        `- engine.currentTime: **${t.engineCurrentTime}**`,
        `- transport.currentTime BEFORE reconcile: **${t.transportBefore}**`,
        `- transport.currentTime AFTER reconcile: **${t.transportAfter}**`,
        `- pendingSeekSeconds: **${t.pendingSeekSeconds}**`,
        `- seekLockUntil: **${t.seekLockUntil}**`,
        `- pendingSeekDeadline: **${t.pendingSeekDeadline}**`,
        `- snapshot.isLoading: **${t.isLoading}**`,
        `- shouldAcceptPositionAfterSeek accept: **${t.accept}**`,
        `- shouldAcceptPositionAfterSeek clearPending: **${t.clearPending}**`,
        `- currentTime branch: **${t.currentTimeBranch}**`,
        `- PATCH or SKIP_PATCH: **${t.patchAction}**${t.patchReason ? ` (${t.patchReason})` : ""}`,
        `- preserved non-engine time: **${t.preservedNonEngine ? "YES" : "no"}**`,
        ...(t.preservedCondition ? [`- condition: \`${t.preservedCondition}\``] : []),
        "",
      );
    }
  }

  md.push("", "## Conclusion", "");

  if (!commitSeekExit || !commitDragSeekExit || !engineSeekExit) {
    md.push(
      "**Seek commit incomplete.** Cannot audit post-seek reconcile ticks until commitDragSeek → commitSeek → engine.seek all execute.",
    );
  } else if (firstDivergence) {
    md.push(
      `**First divergence at Tick ${firstDivergence.tick}** (t+${firstDivergence.tMs}ms).`,
      "",
      `Single conditional: **${firstDivergence.preservedCondition}**`,
      "",
      `- Engine reported **${firstDivergence.engineCurrentTime}s** while transport after reconcile was **${firstDivergence.transportAfter}s**.`,
      `- Branch: \`${firstDivergence.currentTimeBranch}\``,
      `- pendingSeekSeconds: ${firstDivergence.pendingSeekSeconds}`,
      `- accept: ${firstDivergence.accept}, clearPending: ${firstDivergence.clearPending}`,
    );
  } else if (ticks.length >= 10) {
    md.push(
      "**All 10 post-seek reconcile callbacks synchronized engine → transport.** Reconciliation is not the divergence layer for this seek.",
      "",
      "Post-seek layer comparison (from __seekReproSample):",
      "",
      "```json",
      JSON.stringify(post, null, 2),
      "```",
    );
    if (post && typeof post === "object") {
      const p = post as Record<string, unknown>;
      const layers: [string, unknown][] = [
        ["provider.currentTime", (p.provider as Record<string, unknown> | undefined)?.currentTime],
        ["engine.currentTime", (p.engine as Record<string, unknown> | undefined)?.currentTime],
        ["msc.currentTime", (p.msc as Record<string, unknown> | undefined)?.currentTime],
        ["store.currentTime", (p.store as Record<string, unknown> | undefined)?.currentTime],
        ["snapshot.currentTime", (p.snapshot as Record<string, unknown> | undefined)?.currentTime],
        ["ui.sliderValue", (p.ui as Record<string, unknown> | undefined)?.sliderValue],
      ];
      md.push("", "| Layer | currentTime |", "|-------|-------------|");
      for (const [name, val] of layers) {
        md.push(`| ${name} | ${val ?? "?"} |`);
      }
      const engineT = (p.engine as Record<string, unknown> | undefined)?.currentTime;
      const mscT = (p.msc as Record<string, unknown> | undefined)?.currentTime;
      const snapT = (p.snapshot as Record<string, unknown> | undefined)?.currentTime;
      const uiT = (p.ui as Record<string, unknown> | undefined)?.sliderValue;
      md.push("");
      if (engineT !== mscT) md.push(`- Engine vs MSC: **${engineT} vs ${mscT}** — MSC/store layer`);
      else if (snapT !== mscT) md.push(`- Snapshot vs MSC: **${snapT} vs ${mscT}** — useFinalPlaybackSnapshot reads engine directly`);
      else if (uiT !== snapT) md.push(`- UI vs snapshot: **${uiT} vs ${snapT}** — PlaybackSeekBar display/floor`);
      else md.push("- All sampled layers aligned at capture time.");
    }
  } else {
    md.push(`Only ${ticks.length} post-seek callbacks captured (expected 10).`);
  }

  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        commitDragSeekExit: commitDragSeekExit?.text ?? null,
        commitSeekExit: commitSeekExit?.text ?? null,
        engineSeekExit: engineSeekExit?.text ?? null,
        ticks,
        firstDivergence,
        post,
        logs,
      },
      null,
      2,
    ),
  );
  writeFileSync(OUT_MD, md.join("\n"));

  console.log(`Wrote ${OUT_MD}`);
  console.log(
    `Pipeline: commitDragSeek=${!!commitDragSeekExit} commitSeek=${!!commitSeekExit} engineSeek=${!!engineSeekExit}`,
  );
  console.log(`Ticks captured: ${ticks.length}`);
  if (firstDivergence) {
    console.log(`FIRST DIVERGENCE tick ${firstDivergence.tick}: ${firstDivergence.preservedCondition}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
