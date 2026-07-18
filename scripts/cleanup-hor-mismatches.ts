#!/usr/bin/env npx tsx
/**
 * Remove HÖR sets that are not strictly attributable to the expansion artist.
 * Catalog data only — does not touch playback.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists, bulkCatalogSeeds } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists, expansionCatalogSeeds } from "../src/content/artists/catalog-expansion";
import type { CatalogExpansion } from "../src/lib/catalog/types";

const OUT_DIR = join(process.cwd(), "data/catalog-expansion");

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function namesClose(a: string, b: string): boolean {
  const fa = fold(a).replace(/[^a-z0-9]+/g, "");
  const fb = fold(b).replace(/[^a-z0-9]+/g, "");
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  const stripA = fa.replace(/\d+$/, "");
  const stripB = fb.replace(/\d+$/, "");
  return stripA.length >= 4 && stripA === stripB;
}

function isHorTitle(title: string): boolean {
  const t = fold(title);
  return (
    /\|\s*hor\b/.test(t) ||
    /\bhor\s*[-@x]/.test(t) ||
    /\bhor\s+on\s+tour/.test(t) ||
    /\bhor\s+berlin\b/.test(t) ||
    /\bx\s+hor\b/.test(t) ||
    /\/\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s*\//.test(
      t,
    )
  );
}

function parseHorArtistName(title: string): string | null {
  const SKIP =
    /\b(trailer|teaser|clip|short|shorts|aftermovie|recap|announcement|promo|preview|snippet|highlights?|countdown|interview|podcast|talk|q\s*&\s*a)\b|#shorts?/i;
  if (SKIP.test(title)) return null;
  const pipe = title.match(/^(.+?)\s*\|\s*H/i);
  if (pipe) {
    let left = pipe[1].trim();
    if (/^(face\s*2\s*face|f2f|tba|curated by)\b/i.test(left)) {
      const after = left.match(/\s+-\s+(.+)$/);
      if (after) left = after[1].trim();
      else return null;
    }
    // Keep "Label - Artist" → artist; also "Event - Artist"
    const dash = left.match(/^.+?\s+-\s+(.+)$/);
    if (dash) left = dash[1].trim();
    left = left
      .replace(/\s*\(LIVE\)\s*/gi, " ")
      .replace(/\s+b2b\s+.+$/i, "")
      .replace(/\s+&\s+.+$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return left.length >= 2 ? left : null;
  }
  const slot = title.match(
    /^([^\/|]+?)\s*\/\s*(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
  );
  if (slot) {
    const name = slot[1].trim().replace(/\s*\(LIVE\)\s*/gi, " ").trim();
    if (name.length >= 2 && !SKIP.test(name)) return name;
  }
  return null;
}

function artistNameForSlug(slug: string): string | null {
  const bySlug = new Map<string, string>();
  for (const a of [...coreArtists, ...catalogArtists, ...bulkCatalogArtists, ...expansionCatalogArtists]) {
    bySlug.set(a.slug, a.name);
  }
  for (const seed of [...expansionCatalogSeeds, ...bulkCatalogSeeds]) {
    bySlug.set(seed.slug, seed.name);
  }
  return bySlug.get(slug) ?? null;
}

const removed: { slug: string; youtubeId: string; title: string; reason: string }[] = [];
let kept = 0;

for (const file of readdirSync(OUT_DIR).filter((f) => f.endsWith(".json"))) {
  const path = join(OUT_DIR, file);
  const data = JSON.parse(readFileSync(path, "utf8")) as CatalogExpansion;
  const artistName = artistNameForSlug(data.slug);
  if (!artistName) continue;

  const nextSets = [];
  for (const set of data.sets) {
    if (!isHorTitle(set.title) && set.venue !== "HÖR Berlin") {
      nextSets.push(set);
      continue;
    }
    const parsed = parseHorArtistName(set.title);
    if (!parsed) {
      removed.push({
        slug: data.slug,
        youtubeId: set.youtubeId,
        title: set.title,
        reason: "could not parse artist",
      });
      continue;
    }
    if (!namesClose(artistName, parsed)) {
      // Also allow artist name appearing as a clear token in the full title
      // (e.g. "Go Hard or Go Hardcore - Rebekah | HÖR")
      const titleFold = fold(set.title);
      const nameFold = fold(artistName);
      const nameCompact = nameFold.replace(/[^a-z0-9]+/g, "");
      const okInTitle =
        nameCompact.length >= 4 &&
        new RegExp(
          `(^|[^a-z0-9])${nameCompact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
        ).test(titleFold.replace(/[^a-z0-9]+/g, " "));
      // Prefer token check on original fold with spaces
      const tokenOk =
        nameCompact.length >= 4 &&
        new RegExp(
          `(^|[^a-z0-9])${fold(artistName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
        ).test(titleFold);

      if (!tokenOk && !okInTitle) {
        removed.push({
          slug: data.slug,
          youtubeId: set.youtubeId,
          title: set.title,
          reason: `parsed "${parsed}" ≠ artist "${artistName}"`,
        });
        continue;
      }
    }
    nextSets.push(set);
    kept++;
  }

  if (nextSets.length !== data.sets.length) {
    data.sets = nextSets;
    data.updatedAt = new Date().toISOString();
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
}

writeFileSync(
  ".tmp/hor-mismatch-removals.json",
  JSON.stringify({ removed: removed.length, kept, items: removed }, null, 2),
);
console.log(`Removed ${removed.length} mismatched HÖR sets; kept ${kept}`);
for (const r of removed.slice(0, 40)) {
  console.log(`  - ${r.slug}: ${r.reason} :: ${r.title.slice(0, 70)}`);
}
