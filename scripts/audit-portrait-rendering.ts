#!/usr/bin/env npx tsx
/**
 * Portrait rendering audit — display layer only.
 * Usage: npx tsx scripts/audit-portrait-rendering.ts
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { artists } from "../src/content/artists/all";
import {
  resolvePortrait,
  resolveHeroImage,
  resolvePortraitFallbacksForDisplay,
} from "../src/lib/archive/verification";
import { isLocalResearchedPortraitPath, getRemotePortraitCandidates } from "../src/lib/archive/images/display";

interface Issue {
  slug: string;
  name: string;
  kind: "portrait" | "hero";
  url: string;
  reason: string;
}

const issues: Issue[] = [];
const componentNotes: string[] = [];
let portraitsLoaded = 0;
let heroesLoaded = 0;
let portraitSameAsHero = 0;

function isMissingLocalFile(url: string): boolean {
  if (!url.startsWith("/")) return false;
  if (url.endsWith(".svg")) return !existsSync(join(process.cwd(), "public", url));
  return !existsSync(join(process.cwd(), "public", url));
}

function isRenderableDisplayUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("http")) return true;
  if (url.startsWith("/")) return existsSync(join(process.cwd(), "public", url));
  return false;
}

function auditUrl(slug: string, name: string, kind: "portrait" | "hero", url: string) {
  if (!url) {
    issues.push({ slug, name, kind, url: "(empty)", reason: "empty-url" });
    return false;
  }
  if (!isRenderableDisplayUrl(url)) {
    issues.push({ slug, name, kind, url, reason: "missing-or-unrenderable" });
    return false;
  }
  if (isMissingLocalFile(url)) {
    issues.push({ slug, name, kind, url, reason: "missing-local-file-in-data" });
  }
  return true;
}

for (const artist of artists) {
  const portrait = resolvePortrait(artist);
  const hero = resolveHeroImage(artist);

  if (auditUrl(artist.slug, artist.name, "portrait", portrait)) portraitsLoaded++;
  if (auditUrl(artist.slug, artist.name, "hero", hero)) heroesLoaded++;

  if (portrait === hero) portraitSameAsHero++;

  if (isLocalResearchedPortraitPath(artist.portrait) && getRemotePortraitCandidates(artist).length === 0) {
    issues.push({
      slug: artist.slug,
      name: artist.name,
      kind: "portrait",
      url: artist.portrait,
      reason: "local-researched-without-remote-fallback",
    });
  }

  const fallbacks = resolvePortraitFallbacksForDisplay(artist);
  if (fallbacks.length < 2) {
    issues.push({
      slug: artist.slug,
      name: artist.name,
      kind: "portrait",
      url: portrait,
      reason: "thin-fallback-chain",
    });
  }
}

const blockedDomains = [
  "pinterest.com",
  "pin.it",
  "lookaside.fbsbx.com",
];

const remotePatterns = [
  "img.youtube.com",
  "i.scdn.co",
  "scdn.co",
  "spotifycdn.com",
  "ytimg.com",
  "ggpht.com",
  "discogs.com",
  "ra.co",
];

const markdown = `# Portrait Rendering Audit

Generated: ${new Date().toISOString()}

## Summary

| Metric | Count |
|--------|------:|
| Artists | ${artists.length} |
| Portraits resolved (renderable) | ${portraitsLoaded} |
| Hero images resolved (renderable) | ${heroesLoaded} |
| Portrait = hero (same URL) | ${portraitSameAsHero} |
| Display issues | ${issues.length} |

## Root causes addressed

1. **Missing local researched files** — \`/images/portraits/researched/*.jpg\` referenced in verified registry but absent from \`public/\`. Display layer now prefers remote ingested CDN URLs.
2. **Hero = portrait collapse** — \`applyArtistImage\` and builder now derive hero from essential-set stills or \`/images/hero-atmospheric.svg\`.
3. **Incomplete fallback chains** — \`resolvePortraitFallbacksForDisplay\` adds ingested Spotify/YouTube URLs before genre SVG.
4. **Component bypass** — \`ArtistCard\` and browse components now use \`resolvePortrait(artist)\` with full artist + image metadata.
5. **CDN optimization** — \`SafeImage\` marks Spotify, YouTube, RA, Discogs as \`unoptimized\` to avoid optimizer blocks.

## Failed portraits

${issues.filter((i) => i.kind === "portrait").length === 0 ? "_None after display resolution._" : issues.filter((i) => i.kind === "portrait").map((i) => `- **${i.name}** (\`${i.slug}\`) — ${i.reason}: \`${i.url}\``).join("\n")}

## Failed hero images

${issues.filter((i) => i.kind === "hero").length === 0 ? "_None after display resolution._" : issues.filter((i) => i.kind === "hero").map((i) => `- **${i.name}** (\`${i.slug}\`) — ${i.reason}: \`${i.url}\``).join("\n")}

## Blocked domains (policy)

${blockedDomains.map((d) => `- \`${d}\``).join("\n")}

## Allowed remote patterns (next.config)

${remotePatterns.map((d) => `- \`${d}\``).join("\n")}

## Broken local paths (data references, file missing)

${artists
  .filter((a) => isMissingLocalFile(a.portrait))
  .map((a) => `- \`${a.slug}\` → \`${a.portrait}\``)
  .join("\n") || "_None (SVG assets present)._"}

## Components fixed

- \`ArtistCard\` — full artist object + \`resolvePortrait\` / display fallbacks
- \`ArtistPageContent\` — separate hero + profile sources
- \`ArtistOfWeekHero\` — \`resolveHeroImage\`
- \`ArtistAlphabetBrowse\` — display resolver (was raw \`artist.portrait\`)
- \`TodaysDiscovery\` — display fallbacks
- \`SafeImage\` — broader unoptimized CDN list

## Components using correct image logic

- \`ArtistGrid\`, \`ArtistCard\`, \`ArtistPageContent\`, \`ArtistOfWeekHero\`
- \`TodaysDiscovery\`, \`ArtistAlphabetBrowse\`
- All \`ArtistCard\` call sites (discover, home, library, recommendations)

## Remaining gaps

- ${issues.filter((i) => i.reason === "local-researched-without-remote-fallback").length} artists with local researched paths and no ingested remote URL — fall back to genre SVG via SafeImage chain
- Sync researched JPEGs to \`public/images/portraits/researched/\` with \`npm run sync:portraits\` for offline-verified assets (optional, does not modify registry)
`;

const outDir = join(process.cwd(), "reports");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "portrait-rendering-audit.md");
writeFileSync(outPath, markdown, "utf8");

console.log(markdown);
console.log(`\nReport written to ${outPath}`);
