/**
 * End-to-end playback validation against a running dev server.
 *
 * Usage:
 *   npm run dev          # terminal 1
 *   npm run validate:playback  # terminal 2
 *
 * Or: BASE_URL=http://localhost:3000 npx tsx scripts/e2e-playback-validation.ts
 */
import { chromium, type Browser, type Page } from "playwright";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalogTracks, catalogReleases, getTracksByArtist } from "../src/content/tracks";
import { archiveSets } from "../src/content/sets";
import { artists } from "../src/content/artists";
import { getWeeklyDiscoveriesEditorial } from "../src/content/home/feed";
import { analyzePlaybackItem } from "../src/lib/music/playback-source";
import { playbackItemFromTrack, playbackItemFromRelease, playbackItemFromSet } from "../src/lib/music/playback";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const REPORT_PATH = join(process.cwd(), "reports/playback-e2e-validation.md");

interface TestResult {
  id: string;
  surface: string;
  scenario: string;
  passed: boolean;
  detail: string;
}

const results: TestResult[] = [];

function record(
  surface: string,
  scenario: string,
  passed: boolean,
  detail: string,
  id?: string,
): void {
  const entry = { id: id ?? scenario, surface, scenario, passed, detail };
  results.push(entry);
  const icon = passed ? "PASS" : "FAIL";
  console.log(`[${icon}] ${surface} / ${scenario}: ${detail}`);
}

async function waitForPlayer(page: Page, timeout = 8000): Promise<boolean> {
  try {
    await page.waitForSelector('[aria-label="Now playing"]', { timeout });
    return true;
  } catch {
    return false;
  }
}

async function getIframeSrc(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const root = document.getElementById("vitalforge-playback-root");
    const iframe = root?.querySelector("iframe");
    return iframe?.getAttribute("src") ?? null;
  });
}

async function isGlobalPlayerPlaying(page: Page): Promise<boolean> {
  const pauseBtn = page.locator('[aria-label="Now playing"] [aria-label="Pause"]');
  return (await pauseBtn.count()) > 0;
}

async function clickGlobalPause(page: Page): Promise<void> {
  await page.locator('[aria-label="Now playing"] [aria-label="Pause"]').click();
}

async function clickGlobalPlay(page: Page): Promise<void> {
  await page.locator('[aria-label="Now playing"] [aria-label="Play"]').click();
}

async function playFirstTrackRow(page: Page): Promise<string | null> {
  const row = page.locator('[id^="track-"]').first();
  if ((await row.count()) === 0) return null;
  await row.scrollIntoViewIfNeeded();
  const id = await row.getAttribute("id");
  const playBtn = row.locator('button[aria-label^="Play"]').first();
  await playBtn.click({ timeout: 5000 });
  return id;
}

async function playFirstSetButton(page: Page): Promise<boolean> {
  const btn = page.locator('button[aria-label^="Play "]').filter({ hasNot: page.locator('[id^="track-"]') });
  // Set buttons often include set title in aria-label
  const setBtn = page.locator('button[aria-label*="Boiler"], button[aria-label*="Awakenings"], button[aria-label*="Verknipt"], button[aria-label*="HÖR"], button[aria-label*="set"]').first();
  const target = (await setBtn.count()) > 0 ? setBtn : page.locator('button[aria-label^="Play "]').nth(3);
  if ((await target.count()) === 0) return false;
  await target.scrollIntoViewIfNeeded();
  await target.click({ timeout: 5000 });
  return true;
}

async function testSurfacePlay(
  page: Page,
  surface: string,
  url: string,
  mode: "track-row" | "first-play" | "set",
  itemId: string,
): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
  await dismissBlockingModals(page);
  let clicked = false;
  if (mode === "track-row") {
    clicked = (await playFirstTrackRow(page)) !== null;
  } else if (mode === "set") {
    clicked = await playFirstSetButton(page);
  } else {
    const btn = page.locator('button[aria-label^="Play"]').first();
    if ((await btn.count()) > 0) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      clicked = true;
    }
  }
  if (!clicked) {
    record(surface, "play", false, `No play target on ${url}`, itemId);
    return;
  }
  await page.waitForTimeout(2500);
  const playerVisible = await waitForPlayer(page);
  const iframeSrc = await getIframeSrc(page);
  const embedActive =
    iframeSrc !== null && iframeSrc !== "about:blank" && !iframeSrc.includes("about:blank");
  const playing = await isGlobalPlayerPlaying(page);
  const passed = playerVisible && embedActive && playing;
  record(
    surface,
    "play",
    passed,
    passed
      ? `Global player visible, embed loaded, pause control shown`
      : `player=${playerVisible} embed=${embedActive} playing=${playing} src=${iframeSrc?.slice(0, 80) ?? "null"}`,
    itemId,
  );
}

async function testPauseResume(page: Page, surface: string, itemId: string): Promise<void> {
  const wasPlaying = await isGlobalPlayerPlaying(page);
  if (!wasPlaying) {
    record(surface, "pause", false, "Not playing before pause test", itemId);
    record(surface, "resume", false, "Skipped — pause failed", itemId);
    return;
  }
  await clickGlobalPause(page);
  await page.waitForTimeout(800);
  const paused = !(await isGlobalPlayerPlaying(page));
  const iframeAfterPause = await getIframeSrc(page);
  const embedBlank =
    !iframeAfterPause || iframeAfterPause === "about:blank" || iframeAfterPause.includes("about:blank");
  record(
    surface,
    "pause",
    paused && embedBlank,
    paused
      ? `Paused; embed blank=${embedBlank}`
      : `Still showing play as active after pause`,
    itemId,
  );

  await clickGlobalPlay(page);
  await page.waitForTimeout(1500);
  const resumed = await isGlobalPlayerPlaying(page);
  const iframeResumed = await getIframeSrc(page);
  const embedBack =
    iframeResumed !== null && !iframeResumed.includes("about:blank");
  record(
    surface,
    "resume",
    resumed && embedBack,
    resumed ? `Resumed; embed active=${embedBack}` : `Play control still shown after resume click`,
    itemId,
  );
}

async function testRouteChange(page: Page, surface: string, itemId: string): Promise<void> {
  const playerVisibleBefore = await waitForPlayer(page, 2000);
  if (!playerVisibleBefore) {
    record(surface, "route-change", false, "No player active before navigation", itemId);
    return;
  }
  const titleBefore = await page
    .locator('[aria-label="Now playing"] .truncate.font-medium')
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => null);

  // Client-side navigation preserves Zustand + engine state (full page.goto would reset).
  const discoverLink = page.locator('a[href="/discover"]').first();
  if ((await discoverLink.count()) === 0) {
    record(surface, "route-change", false, "No /discover link for client navigation", itemId);
    return;
  }
  await discoverLink.click();
  await page.waitForURL("**/discover**", { timeout: 10000 });
  await page.waitForTimeout(800);

  const playerStillVisible = await waitForPlayer(page, 5000);
  const titleAfter = await page
    .locator('[aria-label="Now playing"] .truncate.font-medium')
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => null);
  const sameTrack = titleBefore === titleAfter;
  record(
    surface,
    "route-change",
    playerStillVisible && sameTrack,
    playerStillVisible
      ? `Player persisted via client nav; track="${titleAfter ?? "?"}"`
      : "Global player disappeared after client route change",
    itemId,
  );
}

async function testRapidSwitch(page: Page, surface: string): Promise<void> {
  const editorial = getWeeklyDiscoveriesEditorial();
  const tracks = editorial.tracks.filter((t) => analyzePlaybackItem(playbackItemFromTrack(t)).playable);
  if (tracks.length < 2) {
    record(surface, "rapid-switch", false, "Not enough playable homepage tracks");
    return;
  }
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await dismissBlockingModals(page);
  const playButtons = page.locator('button[aria-label^="Play "]');
  const count = await playButtons.count();
  if (count < 3) {
    record(surface, "rapid-switch", false, `Only ${count} play buttons on homepage`);
    return;
  }
  for (let i = 0; i < Math.min(5, count); i++) {
    await playButtons.nth(i).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(2000);
  const iframeSrc = await getIframeSrc(page);
  const playerVisible = await waitForPlayer(page, 3000);
  record(
    surface,
    "rapid-switch",
    playerVisible && !!iframeSrc && !iframeSrc.includes("about:blank"),
    `After rapid clicks: player=${playerVisible} embed active`,
  );
}

async function testVisibilityChange(page: Page, surface: string, itemId: string): Promise<void> {
  const before = await waitForPlayer(page, 2000);
  if (!before) {
    record(surface, "tab-visibility-simulated", false, "No player before visibility test", itemId);
    return;
  }
  await page.evaluate(`(() => { document.dispatchEvent(new Event('visibilitychange')); })()`);
  await page.waitForTimeout(400);
  const playerVisible = await waitForPlayer(page, 3000);
  const iframeSrc = await getIframeSrc(page);
  record(
    surface,
    "tab-visibility-simulated",
    playerVisible,
    `Player visible after visibilitychange; embed=${iframeSrc?.includes("about:blank") ? "blank/paused" : "active"}`,
    itemId,
  );
}

async function testPageHide(page: Page, surface: string, itemId: string): Promise<void> {
  const before = await waitForPlayer(page, 2000);
  if (!before) {
    record(surface, "app-switch-simulated", false, "No player before pagehide test", itemId);
    return;
  }
  await page.evaluate(`(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pageshow')); })()`);
  await page.waitForTimeout(400);
  const playerVisible = await waitForPlayer(page, 3000);
  record(
    surface,
    "app-switch-simulated",
    playerVisible,
    playerVisible ? "Player survived pagehide/pageshow" : "Player lost after pagehide/pageshow",
    itemId,
  );
}

async function dismissBlockingModals(page: Page): Promise<void> {
  const skip = page.getByRole("button", { name: "Skip for now" });
  if ((await skip.count()) > 0) {
    await skip.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function runSuite(browser: Browser): Promise<void> {
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
    localStorage.removeItem("vitalforge:playback");
  });
  const page = await context.newPage();

  const editorial = getWeeklyDiscoveriesEditorial();
  const homeTrack = editorial.tracks.find((t) => analyzePlaybackItem(playbackItemFromTrack(t)).playable);
  const homeSet = editorial.sets.find((s) => analyzePlaybackItem(playbackItemFromSet(s)).playable);
  const artist = artists.find((a) =>
    getTracksByArtist(a.slug).some((t) => analyzePlaybackItem(playbackItemFromTrack(t)).playable),
  );
  const artistTrack = artist
    ? getTracksByArtist(artist.slug).find((t) => analyzePlaybackItem(playbackItemFromTrack(t)).playable)
    : undefined;
  const searchQuery = homeTrack?.title.split(" ")[0] ?? "Pressure";
  const playableSet = archiveSets.find((s) => analyzePlaybackItem(playbackItemFromSet(s)).playable);

  // Homepage tracks (Weekly discoveries + Today's discovery)
  await testSurfacePlay(page, "homepage-tracks", BASE_URL, "track-row", homeTrack?.id ?? "homepage");
  if (results.some((r) => r.surface === "homepage-tracks" && r.scenario === "play" && r.passed)) {
    await testPauseResume(page, "homepage-tracks", homeTrack?.id ?? "homepage");
    await testRouteChange(page, "homepage-tracks", homeTrack?.id ?? "homepage");
    await testVisibilityChange(page, "homepage-tracks", homeTrack?.id ?? "homepage");
    await testPageHide(page, "homepage-tracks", homeTrack?.id ?? "homepage");
  }

  // Homepage sets (Essential set of day + weekly sets)
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await dismissBlockingModals(page);
  const setHero = page.locator('button[aria-label^="Play"]').filter({ has: page.locator(".image-zoom") }).first();
  if ((await setHero.count()) > 0) {
    await setHero.scrollIntoViewIfNeeded();
    await setHero.click();
    await page.waitForTimeout(2500);
    const ok = (await waitForPlayer(page)) && (await isGlobalPlayerPlaying(page));
    record("homepage-sets", "play", ok, ok ? "Essential set hero play OK" : "Set hero play failed", homeSet?.id);
    if (ok) await testPauseResume(page, "homepage-sets", homeSet?.id ?? "set");
  } else {
    record("homepage-sets", "play", false, "Essential set hero play button not found", homeSet?.id);
  }

  // Artist page tracks
  if (artist && artistTrack) {
    await testSurfacePlay(
      page,
      "artist-page-tracks",
      `${BASE_URL}/artists/${artist.slug}`,
      "track-row",
      artistTrack.id,
    );
    if (results.some((r) => r.surface === "artist-page-tracks" && r.scenario === "play" && r.passed)) {
      await testPauseResume(page, "artist-page-tracks", artistTrack.id);
    }
  } else {
    record("artist-page-tracks", "play", false, "No playable artist track found");
  }

  // Search tracks
  await page.goto(`${BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`, {
    waitUntil: "networkidle",
  });
  await dismissBlockingModals(page);
  const searchPlay = page.locator('button[aria-label^="Play"]').first();
  if ((await searchPlay.count()) > 0) {
    await searchPlay.click();
    await page.waitForTimeout(2500);
    const ok = (await waitForPlayer(page)) && (await isGlobalPlayerPlaying(page));
    record("search-tracks", "play", ok, ok ? "Search result play OK" : "Search play failed");
    if (ok) await testPauseResume(page, "search-tracks", searchQuery);
  } else {
    record("search-tracks", "play", false, `No play button for query "${searchQuery}"`);
  }

  // Recommended tracks (genre essential tracks — HomeRetentionSections not mounted on /)
  await testSurfacePlay(page, "recommended-tracks", `${BASE_URL}/genres/hard-techno`, "track-row", "genre-essential");

  // Sets directory
  await testSurfacePlay(page, "sets-directory", `${BASE_URL}/sets`, "set", playableSet?.id ?? "sets");

  // Artist page sets
  if (artist) {
    await page.goto(`${BASE_URL}/artists/${artist.slug}#essential-sets`, { waitUntil: "networkidle" });
    await dismissBlockingModals(page);
    const setCardPlay = page.locator("#essential-sets button[aria-label^='Play']").first();
    if ((await setCardPlay.count()) > 0) {
      await setCardPlay.scrollIntoViewIfNeeded();
      await setCardPlay.click();
      await page.waitForTimeout(2500);
      const ok = (await waitForPlayer(page)) && (await isGlobalPlayerPlaying(page));
      record("artist-page-sets", "play", ok, ok ? "Artist set card play OK" : "Artist set play failed");
      if (ok) await testPauseResume(page, "artist-page-sets", "artist-set");
    } else {
      record("artist-page-sets", "play", false, "No set play button in #essential-sets");
    }
  }

  await testRapidSwitch(page, "homepage");

  await context.close();
}

function catalogFailures(): { label: string; count: number; total: number }[] {
  const trackFail = catalogTracks.filter(
    (t) => !analyzePlaybackItem(playbackItemFromTrack(t)).playable,
  ).length;
  const releaseFail = catalogReleases.filter(
    (r) => !analyzePlaybackItem(playbackItemFromRelease(r)).playable,
  ).length;
  const setFail = archiveSets.filter(
    (s) => !analyzePlaybackItem(playbackItemFromSet(s)).playable,
  ).length;
  return [
    { label: "catalog-tracks (missing source URL)", count: trackFail, total: catalogTracks.length },
    { label: "catalog-releases (missing source URL)", count: releaseFail, total: catalogReleases.length },
    { label: "archive-sets (missing source URL)", count: setFail, total: archiveSets.length },
  ];
}

function writeReport(): void {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);
  const total = results.length;
  const catalog = catalogFailures();
  const catalogFailTotal = catalog.reduce((s, c) => s + c.count, 0);
  const e2eAllPassed = failed.length === 0;
  const catalogClean = catalogFailTotal === 0;
  const allPassed = e2eAllPassed && catalogClean;

  const lines = [
    "# Playback E2E Validation Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|--------|------:|",
    `| Automated E2E checks | ${total} |`,
    `| E2E passed | ${passed} |`,
    `| E2E failed | ${failed.length} |`,
    `| Catalog entities without playable source | ${catalogFailTotal} |`,
    `| **Overall validation** | **${allPassed ? "PASS" : "FAIL"}** |`,
    "",
  ];

  if (!e2eAllPassed) {
    lines.push("## E2E failures", "", "| Surface | Scenario | Detail |", "|---------|----------|--------|");
    for (const f of failed) {
      lines.push(`| ${f.surface} | ${f.scenario} | ${f.detail.replace(/\|/g, "/")} |`);
    }
    lines.push("");
  }

  if (!catalogClean) {
    lines.push(
      "## Catalog playback failures (data layer)",
      "",
      "These items route through the global player but **cannot produce audio** — missing Spotify/YouTube/preview URL.",
      "",
      "| Entity | Missing source | Total | % |",
      "|--------|---------------:|------:|--:|",
    );
    for (const row of catalog) {
      if (row.count === 0) continue;
      const pct = Math.round((row.count / row.total) * 100);
      lines.push(`| ${row.label} | ${row.count} | ${row.total} | ${pct}% |`);
    }
    lines.push("");
  }

  lines.push(
    "## Untested / partial coverage",
    "",
    "| Item | Status |",
    "|------|--------|",
    "| Homepage \"Recommended tracks\" (`HomeRetentionSections`) | **Not mounted** on `/` — tested via `/genres/hard-techno` essential tracks instead |",
    "| Real OS tab / app backgrounding | **Simulated only** (`visibilitychange`, `pagehide`) |",
    "| Audible output in headless browser | **Not verified** — DOM/embed state only |",
    "| Full page reload during playback | Resets client store (expected); client-side nav tested |",
    "",
  );

  lines.push("## E2E results (playable items)", "", "| Surface | Scenario | Result | Detail |", "|---------|----------|--------|--------|");
  for (const r of results) {
    lines.push(
      `| ${r.surface} | ${r.scenario} | ${r.passed ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "/")} |`,
    );
  }

  lines.push(
    "",
    "## Stress test",
    "",
    "Run separately: `npm run stress:playback` (generation-token rapid switch, pause/resume, stop).",
    "",
    "## Verdict",
    "",
  );

  if (allPassed) {
    lines.push("All E2E checks and catalog sources passed.", "");
  } else {
    lines.push(
      "**VALIDATION INCOMPLETE.**",
      "",
      e2eAllPassed
        ? "- Interaction layer (play/pause/resume/nav/rapid switch): **PASS** for playable catalog items."
        : `- E2E interaction tests: **${failed.length} failure(s)**.`,
      catalogClean
        ? ""
        : `- Catalog data: **${catalogFailTotal} entities** cannot play until URLs are enriched.`,
      "",
    );
  }

  writeFileSync(REPORT_PATH, lines.join("\n"));
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`\n--- E2E ${passed}/${total}, catalog gaps ${catalogFailTotal} ---\n`);
}

async function main(): Promise<void> {
  let browser: Browser | null = null;
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (!res?.ok) {
      console.error(`Dev server not reachable at ${BASE_URL}. Start with: npm run dev`);
      record("infra", "server", false, `Cannot reach ${BASE_URL}`);
      writeReport();
      process.exit(1);
    }

    browser = await chromium.launch({ headless: true });
    await runSuite(browser);
  } catch (err) {
    record("infra", "runner", false, err instanceof Error ? err.message : String(err));
  } finally {
    await browser?.close();
  }

  writeReport();
  const catalogFailTotal = catalogFailures().reduce((s, c) => s + c.count, 0);
  const anyFailed = results.some((r) => !r.passed) || catalogFailTotal > 0;
  process.exit(anyFailed ? 1 : 0);
}

main();
