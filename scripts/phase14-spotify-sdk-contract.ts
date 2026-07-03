/**
 * Phase 14 — Spotify IFrame SDK contract audit capture.
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/phase14-spotify-sdk-contract.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_MD = join(process.cwd(), "reports/phase14-spotify-sdk-contract.md");
const OUT_JSON = join(process.cwd(), "reports/phase14-spotify-sdk-contract.json");

interface AuditEntry {
  tMs: number;
  kind: string;
  detail: Record<string, unknown>;
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const entries: AuditEntry[] = [];
  const t0 = Date.now();

  page.on("console", async (msg) => {
    const text = msg.text();
    if (!text.includes("[SPOTIFY-SEEK-AUDIT]")) return;
    let detail: Record<string, unknown> = { text };
    try {
      const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => null)));
      if (args.length >= 2 && args[1] && typeof args[1] === "object") {
        detail = args[1] as Record<string, unknown>;
      }
    } catch {
      // keep text fallback
    }
    const kind = text.includes("PLAYBACK_UPDATE")
      ? "PLAYBACK_UPDATE"
      : text.includes("contract_check")
        ? "SEEK_CONTRACT"
        : text.includes("HOST_SEEK")
          ? "HOST_SEEK"
          : text.includes("SDK_CALLBACK")
            ? "SDK_CALLBACK"
            : "OTHER";
    entries.push({ tMs: Date.now() - t0, kind, detail });
  });

  await page.addInitScript(() => {
    localStorage.setItem("vf:spotify-seek-audit", "1");
    localStorage.setItem("vf:seek-trace", "1");
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
  if (!box) throw new Error("no slider");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 8, y);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.move(box.x + box.width * 0.55, y, { steps: 12 });
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(3000);

  const sdkInfo = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src"));
    const iframe = document.querySelector("#vitalforge-playback-root iframe") as HTMLIFrameElement | null;
    return {
      spotifyScript: scripts.find((s) => s?.includes("spotify")) ?? null,
      iframeSrc: iframe?.src ?? null,
      hasOnSpotifyIframeApiReady: typeof (window as Window & { onSpotifyIframeApiReady?: unknown })
        .onSpotifyIframeApiReady === "function",
    };
  });

  await browser.close();

  const seekContract = entries.find((e) => e.kind === "SEEK_CONTRACT");
  const firstUpdateAfterSeek = entries.find(
    (e) => e.kind === "PLAYBACK_UPDATE" && (e.detail.msSinceSeek as number) > 0,
  );
  const lastUpdateBeforeSeek = [...entries]
    .reverse()
    .find(
      (e) =>
        e.kind === "PLAYBACK_UPDATE" &&
        seekContract &&
        e.tMs < seekContract.tMs,
    );

  const md = [
    "# Phase 14 — Spotify IFrame SDK Contract Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## 1. Which SDK/API is used?",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| API | **Spotify IFrame API** (Embed Controller) |`,
    `| Script URL | \`${sdkInfo.spotifyScript ?? "https://open.spotify.com/embed/iframe-api/v1"}\` |`,
    `| Integration file | \`src/lib/music/spotify-embed-api.ts\` |`,
    `| Provider | \`src/lib/music/providers/spotify-provider.ts\` |`,
    `| NOT used | Web Playback SDK, Spotify Web API player/seek |`,
    `| iframe src | \`${sdkInfo.iframeSrc ?? "?"}\` |`,
    "",
    "## 2. Documented `EmbedController.seek()` semantics",
    "",
    "Per [Spotify iFrame API reference](https://developer.spotify.com/documentation/embeds/references/iframe-api):",
    "",
    "- Method: `EmbedController.seek(seconds)`",
    "- Parameter: **`seconds` (integer)** — seconds into the loaded episode/track",
    "- Return: **void / synchronous** — no Promise documented",
    "- Example: `EmbedController.seek(200)` → seek to **200 seconds**",
    "",
    "## 3. Required player state before seek",
    "",
    "Documented prerequisites:",
    "- Content must be **loaded** in the embed (`loadUri` / `loadEntity`)",
    "- **`ready` event** must have fired (embed initialized)",
    "- Runtime gate in integration: `host.isEmbedReady()` (= controller exists + `ready` listener fired)",
    "",
    "No documented requirement that playback must be **playing** (vs paused) before seek.",
    "",
    "## 4. Seek target units — contract vs integration",
    "",
    "| Layer | Intended target | Value passed to `controller.seek()` |",
    "|-------|-----------------|-----------------------------------|",
    "| User seek | 16 seconds | — |",
    "| SpotifyProvider | `target = 16` | `Math.round(target * 1000)` = **16000** |",
    "| SpotifyEmbedHost | parameter name `positionMs` | **16000** (unchanged) |",
    "| **Spotify IFrame API contract** | **`seek(seconds)` integer** | **16000 interpreted as 16000 seconds** |",
    "",
    "**Track duration in capture:** ~29.713s. Passing **16000 seconds** far exceeds duration.",
    "",
    "Official Web API note (different API): seeking past track length can jump to next/end behavior.",
    "",
    "## 5. SDK callbacks around seek (runtime)",
    "",
  ];

  const seekIdx = entries.findIndex((e) => e.kind === "SEEK_CONTRACT");
  const slice = seekIdx >= 0 ? entries.slice(Math.max(0, seekIdx - 3), seekIdx + 8) : entries.slice(0, 15);
  for (const e of slice) {
    md.push(`- t+${e.tMs}ms **${e.kind}** \`${JSON.stringify(e.detail).slice(0, 500)}\``);
  }

  md.push("", "## 6. Raw payload comparison", "");

  if (lastUpdateBeforeSeek) {
    md.push("### Last `playback_update` BEFORE seek", "", "```json", JSON.stringify(lastUpdateBeforeSeek.detail, null, 2), "```");
  } else {
    md.push("_No playback_update captured before seek in this run._");
  }

  md.push("");
  if (seekContract) {
    md.push("### At seek (contract_check)", "", "```json", JSON.stringify(seekContract.detail, null, 2), "```");
  }

  md.push("");
  if (firstUpdateAfterSeek) {
    md.push(
      "### First `playback_update` AFTER seek",
      "",
      "```json",
      JSON.stringify(firstUpdateAfterSeek.detail, null, 2),
      "```",
    );
  }

  md.push("", "## 7. Is 0.11s derived or from SDK?", "");

  const posMsRaw = firstUpdateAfterSeek?.detail.positionMsRaw;
  const posSec = firstUpdateAfterSeek?.detail.position;
  md.push(
    firstUpdateAfterSeek
      ? `- SDK raw \`data.position\` (ms): **${posMsRaw}**`
      : "- _No post-seek update captured_",
    firstUpdateAfterSeek
      ? `- Integration \`spotifyPlaybackFields\`: \`position / 1000\` = **${posSec}** seconds`
      : "",
    firstUpdateAfterSeek && posMsRaw !== undefined
      ? `- **Conclusion:** ${posMsRaw === posSec ? "unlikely" : posSec + "s is **derived** from SDK milliseconds field, not invented"}`
      : "",
  );

  md.push("", "## 8. Known SDK limitations (external)", "");
  md.push(
    "- iFrame API `seek(seconds)` accepts **integer seconds only**; community reports sub-second truncation ([Spotify Community](https://community.spotify.com/t5/Spotify-for-Developers/IFrame-API-truncates-milliseconds-when-using-seek/td-p/7408550))",
    "- iFrame API `play()` may be blocked by browser autoplay policies until user gesture",
    "- iFrame API is **not** the Web Playback SDK (which uses `player.seek(position_ms)` Promise-based)",
    "- `playback_update.position` and `.duration` are documented in **milliseconds**",
  );

  md.push("", "## 9. Classification (evidence-based)", "");
  md.push(
    "**Primary: incorrect use of the Spotify IFrame SDK**",
    "",
    "The integration passes **16000** to `controller.seek()`, naming it milliseconds in code (`positionMs`, `requestedMs`, `targetMs`).",
    "The Spotify IFrame API documents **`seek(seconds)`** — integer **seconds**.",
    "",
    "16000 seconds >> track duration (29.713s) explains runtime behavior:",
    "- SDK accepts call synchronously (no error)",
    "- First `playback_update` reports unrelated position (~0.11s = ~110ms raw)",
    "- Later updates report **duration** (~29713ms = end of track)",
    "",
    "**Not primarily:** missing MSC/router lifecycle (upstream ruled out in Phases 10–13)",
    "",
    "**Secondary SDK limitation:** integer-second seek granularity (would affect sub-second targets even after unit fix)",
  );

  writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sdkInfo,
        entries,
        seekContract,
        lastUpdateBeforeSeek,
        firstUpdateAfterSeek,
      },
      null,
      2,
    ),
  );
  writeFileSync(OUT_MD, md.join("\n"));
  console.log(`Wrote ${OUT_MD}`);
  console.log(`Entries: ${entries.length}, seekContract: ${!!seekContract}, firstUpdate: ${!!firstUpdateAfterSeek}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
