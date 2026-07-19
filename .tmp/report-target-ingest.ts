import { readFileSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../src/content/artists/all";
import { CURATED_FEATURED_SLUGS } from "../src/content/home/featured-pool";

const result = JSON.parse(readFileSync(join(process.cwd(), ".tmp/target-artists/result.json"), "utf8")) as {
  added: { slug: string; name: string }[];
  skipped?: { slug: string; name: string }[];
  failed?: { name: string; reason: string }[];
};
const NEW = new Set(result.added.map((a) => a.slug));
const bySlug = new Map(artists.map((a) => [a.slug, a]));
const featured = new Set(CURATED_FEATURED_SLUGS as readonly string[]);

const httpRe = /^https?:\/\//;
console.log("slug | name | tier | tracks | sets | portrait✓ | hero✓ | featured✓ | spotifyId | country");
console.log("-".repeat(120));
for (const a of result.added) {
  const art = bySlug.get(a.slug);
  if (!art) { console.log(`${a.slug} | MISSING`); continue; }
  const portraitOk = httpRe.test(art.portrait) || art.portrait.startsWith("/");
  const heroOk = httpRe.test(art.heroImage) || art.heroImage.startsWith("/");
  console.log(
    [a.slug, art.name, art.curationTier, art.topTracks.length, art.essentialSets.length,
     portraitOk ? "Y" : "N", heroOk ? "Y" : "N", featured.has(a.slug) ? "Y" : "N",
     art.spotifyArtistId, art.country].join(" | ")
  );
}

// Aggregate set events across new artists
const events: Record<string, number> = {};
let tracks = 0, sets = 0;
for (const slug of NEW) {
  const art = bySlug.get(slug)!;
  tracks += art.topTracks.length;
  for (const s of art.essentialSets) events[s.venue] = (events[s.venue] ?? 0) + 1;
  sets += art.essentialSets.length;
}
console.log("\nTOTALS: artists=%d tracks=%d sets=%d", NEW.size, tracks, sets);
console.log("SETS BY EVENT:", events);
console.log("\nSKIPPED (already existed):", (result.skipped ?? []).map((s) => s.name).join(", ") || "none");
console.log("\nFAILED / could not verify:");
for (const f of result.failed ?? []) console.log(`  - ${f.name}: ${f.reason}`);
