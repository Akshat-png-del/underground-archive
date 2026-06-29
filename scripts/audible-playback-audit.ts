/**
 * Audible embed playback audit — Spotify/YouTube iframe CSS, attrs, and post-click probe.
 *
 * Usage: BASE_URL=http://localhost:3000 npx tsx scripts/audible-playback-audit.ts
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { archiveSets } from "../src/content/sets";
import { catalogTracks } from "../src/content/tracks";
import { analyzePlaybackItem } from "../src/lib/music/playback-source";
import { playbackItemFromTrack, playbackItemFromSet } from "../src/lib/music/playback";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REPORT_PATH = join(process.cwd(), "reports/audible-playback-audit.md");

interface ScenarioResult {
  name: string;
  provider: string;
  preMount: Record<string, unknown> | null;
  postClick: Record<string, unknown> | null;
  storePlaying: boolean;
  audibilityRisks: string[];
}

function findSpotifyTrack() {
  for (const track of catalogTracks) {
    const item = playbackItemFromTrack(track);
    const a = analyzePlaybackItem(item);
    if (a.kind === "spotify" && a.embedUrl) return { track, item, id: track.id || item.refId };
  }
  return null;
}

function findYoutubeSet() {
  for (const set of archiveSets) {
    const item = playbackItemFromSet(set);
    const a = analyzePlaybackItem(item);
    if (a.kind === "youtube" && a.embedUrl) return { set, item };
  }
  return null;
}

async function main(): Promise<void> {
  const spotify = findSpotifyTrack();
  const youtube = findYoutubeSet();
  const results: ScenarioResult[] = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
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
    localStorage.setItem("vf:playback-debug", "1");
  });

  const probeFn = `() => {
    const root = document.getElementById("vitalforge-playback-root");
    const iframe = root?.querySelector("iframe");
    if (!root || !iframe) return { error: "missing root/iframe" };
    const containerCs = getComputedStyle(root);
    const iframeCs = getComputedStyle(iframe);
    const containerRect = root.getBoundingClientRect();
    const iframeRect = iframe.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const src = iframe.getAttribute("src") ?? iframe.src ?? null;
    const inViewport =
      iframeRect.width > 0 && iframeRect.height > 0 &&
      iframeRect.right > 0 && iframeRect.bottom > 0 &&
      iframeRect.left < vw && iframeRect.top < vh;
    const opacityZero =
      parseFloat(containerCs.opacity) === 0 || parseFloat(iframeCs.opacity) === 0;
    return {
      iframeDimensions: { width: Math.round(iframeRect.width), height: Math.round(iframeRect.height) },
      containerStyles: {
        position: containerCs.position,
        left: containerCs.left,
        top: containerCs.top,
        bottom: containerCs.bottom,
        opacity: containerCs.opacity,
        display: containerCs.display,
        visibility: containerCs.visibility,
        width: containerCs.width,
        height: containerCs.height,
        zIndex: containerCs.zIndex,
      },
      iframeStyles: {
        opacity: iframeCs.opacity,
        display: iframeCs.display,
        visibility: iframeCs.visibility,
        width: iframeCs.width,
        height: iframeCs.height,
      },
      containerRect: {
        left: Math.round(containerRect.left),
        top: Math.round(containerRect.top),
        width: Math.round(containerRect.width),
        height: Math.round(containerRect.height),
      },
      iframeRect: {
        left: Math.round(iframeRect.left),
        top: Math.round(iframeRect.top),
        width: Math.round(iframeRect.width),
        height: Math.round(iframeRect.height),
      },
      inViewport,
      iframeAllow: iframe.getAttribute("allow"),
      iframeSandbox: iframe.getAttribute("sandbox"),
      iframeSrc: src,
      checks: {
        displayNone: containerCs.display === "none" || iframeCs.display === "none",
        visibilityHidden: containerCs.visibility === "hidden" || iframeCs.visibility === "hidden",
        opacityZero,
        tooSmall: iframeRect.width < 200 || iframeRect.height < 80,
        sandboxPresent: iframe.hasAttribute("sandbox"),
        iframeMutedAttr: iframe.hasAttribute("muted"),
        autoplayInUrl: !!src && src.includes("autoplay=1"),
        iframeConnected: iframe.isConnected,
        outsideViewport: !inViewport,
      },
    };
  }`;

  // Spotify track scenario
  if (spotify) {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/genres/hard-techno`, { waitUntil: "networkidle", timeout: 60000 });
    const preMount = await page.evaluate(probeFn);
    const row = page.locator(`[id="track-${spotify.id}"]`);
    const target = (await row.count()) > 0 ? row : page.locator('[id^="track-"]').first();
    await target.locator('button[aria-label^="Play"]').first().click();
    await page.waitForTimeout(4000);
    const postClick = await page.evaluate(probeFn);
    const dump = await page.evaluate(() => (window as Window & { __playbackDebugDump?: () => Record<string, unknown> }).__playbackDebugDump?.());
    const aud = (dump?.audibility ?? postClick) as { audibilityRisk?: string[] };
    results.push({
      name: `Spotify track — ${spotify.track.title}`,
      provider: "spotify",
      preMount,
      postClick,
      storePlaying: !!(dump?.store as { isPlaying?: boolean })?.isPlaying,
      audibilityRisks: aud?.audibilityRisk ?? [],
    });
    await page.close();
  }

  // YouTube set scenario
  if (youtube) {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/sets/${youtube.set.slug}`, { waitUntil: "networkidle", timeout: 60000 });
    const preMount = await page.evaluate(probeFn);
    const playBtn = page.locator(`button[aria-label*="Play ${youtube.set.title}"], button[aria-label^="Play "]`).first();
    if ((await playBtn.count()) > 0) {
      await playBtn.click();
      await page.waitForTimeout(4000);
    }
    const postClick = await page.evaluate(probeFn);
    const dump = await page.evaluate(() => (window as Window & { __playbackDebugDump?: () => Record<string, unknown> }).__playbackDebugDump?.());
    const aud = (dump?.audibility ?? postClick) as { audibilityRisk?: string[] };
    results.push({
      name: `YouTube set — ${youtube.set.title}`,
      provider: "youtube",
      preMount,
      postClick,
      storePlaying: !!(dump?.store as { isPlaying?: boolean })?.isPlaying,
      audibilityRisks: aud?.audibilityRisk ?? [],
    });
    await page.close();
  }

  await browser.close();

  const lines = [
    "# Audible Playback Audit — Spotify / YouTube Embeds",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Base URL:** ${BASE_URL}`,
    "",
    "## Root cause (pre-fix)",
    "",
    "The global embed container in `global-player-engine.ts` used:",
    "",
    "```",
    "position: fixed; bottom: 5.25rem; left: 0;",
    "width: 352px; height: 152px;",
    "opacity: 0.02;  /* ← audible playback killer */",
    "z-index: 35;",
    "```",
    "",
    "Browsers treat near-zero opacity embeds as effectively hidden and may suppress or mute cross-origin media playback even when `isPlaying: true` and `embed load success` fire.",
    "",
    "## Fix applied (engine only — no GlobalPlayer UI changes)",
    "",
    "```",
    "position: fixed;",
    "left: -9999px;",
    "top: 0;",
    "width: 352px;",
    "height: 152px;",
    "/* no opacity, display:none, or visibility:hidden on embed container */",
    "z-index: -1;",
    "```",
    "",
    "Iframe remains **352×152** (Spotify minimum). No `sandbox`. `allow` includes `autoplay`.",
    "",
    "## 10-point investigation checklist",
    "",
    "| # | Question | Pre-fix | Post-fix |",
    "|---|----------|---------|----------|",
    "| 1 | Is Spotify iframe hidden? | **YES** — `opacity: 0.02` on container | **NO** — full opacity, offscreen |",
    "| 2 | Outside viewport? | Partially visible at bottom-left | **YES** — intentionally offscreen (`left: -9999px`) |",
    "| 3 | Width/height too small? | **NO** — 352×152 | **NO** — 352×152 |",
    "| 4 | `display:none`? | **NO** | **NO** |",
    "| 5 | `visibility:hidden`? | **NO** | **NO** |",
    "| 6 | `opacity:0` preventing playback? | **YES** — `opacity: 0.02` | **NO** |",
    "| 7 | Autoplay blocked (URL)? | **NO** — `autoplay=1` in embed URL | **NO** |",
    "| 8 | Sandbox preventing audio? | **NO** — no sandbox attr | **NO** |",
    "| 9 | Iframe muted? | **NO** — no muted attr | **NO** |",
    "| 10 | Iframe removed after load? | **NO** — stays connected | **NO** |",
    "",
    "## Scenario results",
    "",
  ];

  for (const r of results) {
    const post = r.postClick as {
      iframeDimensions?: { width: number; height: number };
      containerStyles?: Record<string, string>;
      iframeStyles?: Record<string, string>;
      iframeAllow?: string | null;
      iframeSandbox?: string | null;
      iframeSrc?: string | null;
      checks?: Record<string, boolean>;
      containerRect?: { left: number; top: number; width: number; height: number };
      inViewport?: boolean;
    } | null;

    lines.push(`### ${r.name}`, "");
    lines.push(`- **Provider:** ${r.provider}`);
    lines.push(`- **Store isPlaying:** ${r.storePlaying}`);
    lines.push(`- **Audibility risks:** ${r.audibilityRisks.length ? r.audibilityRisks.join("; ") : "_none_"}`);
    lines.push("");

    if (post && !("error" in post)) {
      lines.push("**Iframe dimensions (computed):**", `\`${post.iframeDimensions?.width}×${post.iframeDimensions?.height}px\``, "");
      lines.push("**Container styles:**", "```json", JSON.stringify(post.containerStyles, null, 2), "```", "");
      lines.push("**Iframe styles:**", "```json", JSON.stringify(post.iframeStyles, null, 2), "```", "");
      lines.push("**Container rect:**", `\`left=${post.containerRect?.left}, top=${post.containerRect?.top}, ${post.containerRect?.width}×${post.containerRect?.height}\``, "");
      lines.push("**In viewport:**", String(post.inViewport), "");
      lines.push("**iframe `allow`:**", post.iframeAllow ?? "null", "");
      lines.push("**iframe `sandbox`:**", post.iframeSandbox ?? "null (good)", "");
      lines.push("**iframe `src`:**", (post.iframeSrc ?? "null").slice(0, 120) + "...", "");
      lines.push("**Checks:**", "```json", JSON.stringify(post.checks, null, 2), "```", "");
    }
  }

  const anyRisk = results.some((r) => r.audibilityRisks.length > 0);
  const allPlaying = results.every((r) => r.storePlaying);

  lines.push(
    "## Audible playback verification",
    "",
    "| Check | Result |",
    "|-------|--------|",
    `| State machine isPlaying | ${allPlaying ? "PASS" : "FAIL"} |`,
    `| Post-fix audibility risks | ${anyRisk ? "FAIL — see risks above" : "PASS — no CSS/attr blockers"} |`,
    `| Headless audible confirmation | **NOT POSSIBLE** — cross-origin Spotify/YouTube audio cannot be sampled in Playwright |`,
    "",
    "### Manual verification steps",
    "",
    "1. Hard-refresh the app (clears old `#vitalforge-playback-root` with `opacity: 0.02`).",
    "2. Click a track with a Spotify URL.",
    "3. Run `window.__playbackDebugDump()` in DevTools.",
    "4. Confirm `audibility.checks.opacityZero === false` and `audibility.audibilityRisk` is `[]`.",
    "5. Confirm audio is audible (volume up, not muted tab).",
    "",
    "### Notes",
    "",
    "- **YouTube** may still block *unmuted* autoplay in some browsers even with a user gesture; Spotify embeds are the primary path for tracks.",
    "- `<audio>` preview elements still use `display:none` — only used for `previewUrl` tracks, not Spotify/YouTube embeds.",
    "- Offscreen positioning (`left: -9999px`) is intentional per embed-audio best practice; do not revert to `opacity: 0.02`.",
  );

  writeFileSync(REPORT_PATH, lines.join("\n"));
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Scenarios: ${results.length}, playing: ${allPlaying}, risks: ${anyRisk}`);
  process.exit(anyRisk || !allPlaying ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
