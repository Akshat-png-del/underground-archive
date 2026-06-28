import {
  fetchSpotifyPortraitCandidate,
  fetchDiscogsPortraitCandidate,
  fetchBeatportPortraitCandidate,
  fetchRAPortraitCandidate,
  scrapeSpotifyArtistId,
  fetchPageHtml,
  fetchOpenGraphImage,
} from "../src/lib/ingestion/portrait-sources";
import { fetchSpotifyPortrait } from "../src/lib/ingestion/opengraph";

async function probe(name: string, slug: string) {
  console.log(`\n==== ${name} ====`);
  const id = await scrapeSpotifyArtistId(name);
  console.log("spotify scrape id:", id);
  if (id) {
    const p = await fetchSpotifyPortrait(id);
    console.log("spotify portrait:", p);
  }

  const oembed = await fetchOpenGraphImage(`https://ra.co/dj/${slug.replace(/-/g, "")}`);
  console.log("RA og:", oembed?.slice(0, 80));

  const discogsHtml = await fetchPageHtml(
    `https://www.discogs.com/search/?q=${encodeURIComponent(name)}&type=artist`
  );
  console.log("discogs html len:", discogsHtml?.length ?? 0);
  const path = discogsHtml?.match(/href="(\/artist\/\d+-[^"?#]+)"/)?.[1];
  console.log("discogs path:", path);

  const beatportHtml = await fetchPageHtml(
    `https://www.beatport.com/search?q=${encodeURIComponent(name)}`
  );
  console.log("beatport html len:", beatportHtml?.length ?? 0);
  const bp = beatportHtml?.match(/href="(\/artist\/[^"?#]+\/\d+)"/)?.[1];
  console.log("beatport path:", bp);

  const ctx = { slug, name };
  for (const [label, fn] of [
    ["spotify", () => fetchSpotifyPortraitCandidate(ctx)],
    ["discogs", () => fetchDiscogsPortraitCandidate(ctx)],
    ["beatport", () => fetchBeatportPortraitCandidate(ctx)],
    ["ra", () => fetchRAPortraitCandidate(ctx)],
  ] as const) {
    const r = await fn();
    console.log(label, ":", r?.url?.slice(0, 80) ?? null);
  }
}

async function main() {
  await probe("Lucy", "lucy");
  await probe("Josh Wink", "josh-wink");
  await probe("Blawan", "blawan");
}

main();
