#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync } from "node:fs";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists, bulkCatalogSeeds } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists, expansionCatalogSeeds } from "../src/content/artists/catalog-expansion";

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/œ/g, "oe");
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
function hasBrand(t: string) {
  const x = fold(t);
  return (
    /\|\s*hor\b/.test(x) ||
    /\bhor\s*[-@x]/.test(x) ||
    /\bhor\s+on\s+tour/.test(x) ||
    /\bhor\s+berlin\b/.test(x) ||
    /\bx\s+hor\b/.test(x)
  );
}
function parse(title: string): string | null {
  const pipe = title.match(/^(.+?)\s*\|\s*H/i);
  if (!pipe) return null;
  let left = pipe[1].trim();
  if (/^(face\s*2\s*face|f2f|tba|curated by)\b/i.test(left)) {
    const after = left.match(/\s+-\s+(.+)$/);
    if (after) left = after[1].trim();
    else return null;
  }
  const dash = left.match(/^.+?\s+-\s+(.+)$/);
  if (dash) left = dash[1].trim();
  left = left
    .replace(/^(f2f|face\s*2\s*face)\s+/i, "")
    .replace(/\s*\(LIVE\)\s*/gi, " ")
    .replace(/\s+b2b\s+.+$/i, "")
    .replace(/\s+&\s+.+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return left.length >= 2 ? left : null;
}

const bySlug = new Map<string, { slug: string; name: string }>();
for (const a of [...coreArtists, ...catalogArtists, ...bulkCatalogArtists, ...expansionCatalogArtists]) {
  bySlug.set(a.slug, a);
}
for (const s of [...expansionCatalogSeeds, ...bulkCatalogSeeds]) {
  bySlug.set(s.slug, s);
}
const catalog = [...bySlug.values()];
const eligible = JSON.parse(readFileSync(".tmp/hor-eligible-sets.json", "utf8")) as {
  id: string;
  title: string;
}[];
const unmatched = new Map<string, { name: string; count: number; sampleTitle: string; youtubeIds: string[] }>();
for (const d of eligible) {
  if (!hasBrand(d.title)) continue;
  const parsed = parse(d.title);
  if (!parsed) continue;
  const hit = catalog.find((a) => namesClose(a.name, parsed));
  if (hit) continue;
  const titleFold = fold(d.title);
  const tokenHit = catalog.find((a) => {
    const nf = fold(a.name);
    if (nf.replace(/[^a-z0-9]/g, "").length < 4) return false;
    return new RegExp(
      `(^|[^a-z0-9])${nf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
    ).test(titleFold);
  });
  if (tokenHit) continue;
  const k = fold(parsed);
  const cur = unmatched.get(k);
  if (cur) {
    cur.count++;
    cur.youtubeIds.push(d.id);
  } else {
    unmatched.set(k, { name: parsed, count: 1, sampleTitle: d.title, youtubeIds: [d.id] });
  }
}
const queue = [...unmatched.values()].sort((a, b) => b.count - a.count);
writeFileSync(
  ".tmp/hor-unmatched-queue.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), total: queue.length, queue }, null, 2),
);
console.log("queue", queue.length);
console.log(
  "top:",
  queue
    .slice(0, 20)
    .map((q) => `${q.name}(${q.count})`)
    .join(", "),
);
