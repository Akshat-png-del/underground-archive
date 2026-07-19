/**
 * Homepage exposure budget — editorial curation for one 5-minute rotation.
 *
 * Rules:
 * - An artist may appear in at most ONE major section, optionally + ONE carousel.
 * - Tracks and sets are unique across the homepage for the rotation.
 * - At most ONE set per artist per rotation.
 * - Prefer unused / lower-exposure artists; priority S-tier → growing → rising → long-tail.
 *
 * Content/homepage only — does not touch playback.
 */
import { artists } from "@/content/artists";
import { getCurationTier } from "@/lib/archive/curation/tiers";
import { getCuratedFeaturedArtists, CURATED_FEATURED_SLUGS } from "@/content/home/featured-pool";
import { fiveMinuteIndex } from "@/content/home/rotation";
import { getDisplaySets, getHorBerlinSets } from "@/content/sets";
import { getDisplayTracks, sortCatalogTracksDeterministic } from "@/content/tracks";
import type { Artist } from "@/types";
import type { ArchiveSet, CatalogTrack } from "@/types/library";

export type SectionKind = "major" | "carousel";

const S_TIER = new Set<string>(CURATED_FEATURED_SLUGS.slice(0, 24));

function hashSeed(n: number): number {
  let x = (n + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function slugHash(slug: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < slug.length; i++) {
    h = Math.imul(h ^ slug.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

function rotate<T>(items: readonly T[], start: number): T[] {
  if (items.length === 0) return [];
  const s = ((start % items.length) + items.length) % items.length;
  return [...items.slice(s), ...items.slice(0, s)];
}

function priorityRank(artist: Artist): number {
  if (S_TIER.has(artist.slug)) return 0;
  if (artist.trending) return 1;
  const tier = getCurationTier(artist.slug);
  if (tier === 1) return 2;
  if (tier === 2) return 3;
  return 4;
}

function sortByPriority(pool: Artist[], rotation: number): Artist[] {
  const seed = hashSeed(rotation * 2654435761);
  return [...pool].sort((a, b) => {
    const pr = priorityRank(a) - priorityRank(b);
    if (pr !== 0) return pr;
    return slugHash(a.slug, seed) - slugHash(b.slug, seed) || a.slug.localeCompare(b.slug);
  });
}

class ExposureBudget {
  private major = new Set<string>();
  private carousel = new Set<string>();
  private tracks = new Set<string>();
  private sets = new Set<string>();
  private setArtists = new Set<string>();

  artistAllowed(slug: string, kind: SectionKind): boolean {
    const majorHits = this.major.has(slug) ? 1 : 0;
    const carouselHits = this.carousel.has(slug) ? 1 : 0;
    if (kind === "major") {
      if (majorHits > 0) return false;
      // already used carousel only → still ok for one major
      return true;
    }
    // carousel
    if (carouselHits > 0) return false;
    if (majorHits > 0 && carouselHits > 0) return false;
    // major + carousel max: if already in major, carousel still allowed once
    return true;
  }

  claimArtist(slug: string, kind: SectionKind): boolean {
    if (!this.artistAllowed(slug, kind)) return false;
    if (kind === "major") this.major.add(slug);
    else this.carousel.add(slug);
    return true;
  }

  claimTrack(id: string): boolean {
    if (this.tracks.has(id)) return false;
    this.tracks.add(id);
    return true;
  }

  claimSet(set: ArchiveSet): boolean {
    if (this.sets.has(set.id)) return false;
    if (this.setArtists.has(set.artistSlug)) return false;
    this.sets.add(set.id);
    this.setArtists.add(set.artistSlug);
    return true;
  }

  pickArtists(
    pool: Artist[],
    count: number,
    kind: SectionKind,
    rotation: number,
  ): Artist[] {
    const ordered = sortByPriority(pool, rotation);
    const out: Artist[] = [];
    for (const a of ordered) {
      if (out.length >= count) break;
      if (this.claimArtist(a.slug, kind)) out.push(a);
    }
    // Fill from full catalog if pool exhausted
    if (out.length < count) {
      for (const a of sortByPriority(artists, rotation + 17)) {
        if (out.length >= count) break;
        if (this.claimArtist(a.slug, kind)) out.push(a);
      }
    }
    return out;
  }

  pickSets(pool: ArchiveSet[], count: number, rotation: number): ArchiveSet[] {
    const ordered = rotate(
      [...pool].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)),
      hashSeed(rotation) % Math.max(pool.length, 1),
    );
    const out: ArchiveSet[] = [];
    for (const s of ordered) {
      if (out.length >= count) break;
      if (!this.artistAllowed(s.artistSlug, "carousel")) continue;
      if (!this.claimSet(s)) continue;
      this.claimArtist(s.artistSlug, "carousel");
      out.push(s);
    }
    return out;
  }

  pickTracks(pool: CatalogTrack[], count: number, rotation: number): CatalogTrack[] {
    const ordered = rotate(
      sortCatalogTracksDeterministic(pool),
      hashSeed(rotation + 99) % Math.max(pool.length, 1),
    );
    const out: CatalogTrack[] = [];
    for (const t of ordered) {
      if (out.length >= count) break;
      if (!this.claimTrack(t.id)) continue;
      // Track row is carousel-level artist exposure
      if (this.artistAllowed(t.artistSlug, "carousel")) {
        this.claimArtist(t.artistSlug, "carousel");
      }
      out.push(t);
    }
    return out;
  }
}

export interface HomepageExposureLayout {
  rotationIndex: number;
  artistOfWeek: Artist;
  trendingViewed: Artist[];
  trendingSaved: Artist[];
  mostSaved: Artist[];
  weeklyArtists: Artist[];
  communityDiscussed: Artist[];
  essentialSet: ArchiveSet;
  horBerlin: ArchiveSet[];
  weeklySets: ArchiveSet[];
  communitySets: ArchiveSet[];
  weeklyTracks: CatalogTrack[];
  releases: {
    title: string;
    year: number;
    coverArt: string;
    artist: string;
    artistSlug: string;
  }[];
  discovery: {
    artist: Artist;
    set: ArchiveSet;
    track: CatalogTrack;
  };
}

const layoutCache = new Map<number, HomepageExposureLayout>();

function buildLayout(rotationIndex: number): HomepageExposureLayout {
  const budget = new ExposureBudget();
  const featured = getCuratedFeaturedArtists();
  const all = artists;

  // --- Major hero slots first (highest priority artists) ---
  const artistOfWeek =
    budget.pickArtists(featured, 1, "major", rotationIndex)[0] ??
    featured[0] ??
    all[0]!;

  let discoveryArtist =
    budget.pickArtists(featured, 1, "major", rotationIndex + 3)[0] ??
    budget.pickArtists(all, 1, "major", rotationIndex + 3)[0] ??
    artistOfWeek;

  // Essential set — major; prefer different artist than AoW / discovery
  const allSets = getDisplaySets();
  const essentialCandidates = rotate(
    [...allSets].sort((a, b) => b.date.localeCompare(a.date)),
    hashSeed(rotationIndex + 7) % Math.max(allSets.length, 1),
  );
  let essentialSet = essentialCandidates[0]!;
  for (const s of essentialCandidates) {
    if (s.artistSlug === artistOfWeek.slug || s.artistSlug === discoveryArtist.slug) continue;
    if (budget.claimSet(s) && budget.claimArtist(s.artistSlug, "major")) {
      essentialSet = s;
      break;
    }
  }
  if (!budget.sets.has(essentialSet.id)) {
    // fallback: claim whatever works
    for (const s of essentialCandidates) {
      if (budget.claimSet(s)) {
        budget.claimArtist(s.artistSlug, "major");
        essentialSet = s;
        break;
      }
    }
  }

  // Discovery set + track (major) — must match discovery artist; claim before carousel sets.
  function pickOwnedSet(slug: string, seed: number): ArchiveSet | undefined {
    const owned = allSets.filter((s) => s.artistSlug === slug);
    if (owned.length === 0) return undefined;
    for (const s of rotate(owned, hashSeed(seed) % owned.length)) {
      if (budget.claimSet(s)) return s;
    }
    return undefined;
  }
  function pickOwnedTrack(slug: string, seed: number): CatalogTrack | undefined {
    const owned = getDisplayTracks().filter((t) => t.artistSlug === slug);
    if (owned.length === 0) return undefined;
    for (const t of rotate(owned, hashSeed(seed) % owned.length)) {
      if (budget.claimTrack(t.id)) return t;
    }
    return undefined;
  }

  let discoverySet = pickOwnedSet(discoveryArtist.slug, rotationIndex + 111);
  let discoveryTrack = pickOwnedTrack(discoveryArtist.slug, rotationIndex + 127);

  if (!discoverySet || !discoveryTrack) {
    const pool = rotate(
      featured.filter((a) => a.slug !== artistOfWeek.slug && a.slug !== discoveryArtist.slug),
      hashSeed(rotationIndex + 131) % Math.max(featured.length, 1),
    );
    for (const candidate of [...pool, ...featured, ...all]) {
      if (candidate.slug === artistOfWeek.slug) continue;
      if (candidate.slug !== discoveryArtist.slug && !budget.artistAllowed(candidate.slug, "major")) {
        continue;
      }
      const set = pickOwnedSet(candidate.slug, rotationIndex + 111);
      const track = pickOwnedTrack(candidate.slug, rotationIndex + 127);
      if (!set || !track) continue;
      if (candidate.slug !== discoveryArtist.slug && !budget.claimArtist(candidate.slug, "major")) {
        continue;
      }
      discoveryArtist = candidate;
      discoverySet = set;
      discoveryTrack = track;
      break;
    }
  }

  // Final invariant — never ship a mismatched trio.
  if (
    !discoverySet ||
    !discoveryTrack ||
    discoverySet.artistSlug !== discoveryArtist.slug ||
    discoveryTrack.artistSlug !== discoveryArtist.slug
  ) {
    const set =
      allSets.find((s) => {
        if (s.artistSlug === artistOfWeek.slug) return false;
        if (budget.sets.has(s.id)) return false;
        return getDisplayTracks().some((t) => t.artistSlug === s.artistSlug && !budget.tracks.has(t.id));
      }) ??
      allSets.find((s) => getDisplayTracks().some((t) => t.artistSlug === s.artistSlug)) ??
      allSets[0]!;
    discoveryArtist =
      featured.find((a) => a.slug === set.artistSlug) ??
      all.find((a) => a.slug === set.artistSlug) ??
      discoveryArtist;
    discoverySet = set;
    budget.claimSet(set);
    budget.claimArtist(discoveryArtist.slug, "major");
    const ownedTracks = getDisplayTracks().filter((t) => t.artistSlug === discoveryArtist.slug);
    discoveryTrack = ownedTracks.find((t) => budget.claimTrack(t.id)) ?? ownedTracks[0]!;
    if (discoveryTrack && !budget.tracks.has(discoveryTrack.id)) {
      budget.claimTrack(discoveryTrack.id);
    }
  }

  // --- Carousel / multi-artist majors (each section is one major surface) ---
  const trendingViewed = budget.pickArtists(featured, 6, "major", rotationIndex + 11);
  const trendingSaved = budget.pickArtists(featured, 6, "major", rotationIndex + 19);
  const mostSaved = budget.pickArtists(featured, 6, "major", rotationIndex + 29);
  const weeklyArtists = budget.pickArtists(featured, 5, "major", rotationIndex + 41);
  const communityDiscussed = budget.pickArtists(featured, 4, "major", rotationIndex + 53);

  // --- Sets (unique; one per artist) ---
  const horBerlin = budget.pickSets(getHorBerlinSets(), 6, rotationIndex + 61);
  const weeklySets = budget.pickSets(allSets, 2, rotationIndex + 71);
  const communitySets = budget.pickSets(allSets, 3, rotationIndex + 83);

  // --- Tracks ---
  const weeklyTracks = budget.pickTracks(getDisplayTracks(), 3, rotationIndex + 97);
  // Releases — unique artists, carousel-level
  const releasePool = all
    .filter((a) => a.curationTier === 1)
    .flatMap((a) =>
      [...a.singles, ...a.eps].slice(0, 1).map((r) => ({
        ...r,
        artist: a.name,
        artistSlug: a.slug,
      })),
    )
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

  const releases: HomepageExposureLayout["releases"] = [];
  for (const r of rotate(releasePool, hashSeed(rotationIndex + 101) % Math.max(releasePool.length, 1))) {
    if (releases.length >= 8) break;
    if (!budget.artistAllowed(r.artistSlug, "carousel")) continue;
    if (!budget.claimArtist(r.artistSlug, "carousel")) continue;
    releases.push(r);
  }

  return {
    rotationIndex,
    artistOfWeek,
    trendingViewed,
    trendingSaved,
    mostSaved,
    weeklyArtists,
    communityDiscussed,
    essentialSet,
    horBerlin,
    weeklySets,
    communitySets,
    weeklyTracks,
    releases,
    discovery: {
      artist: discoveryArtist,
      set: discoverySet,
      track: discoveryTrack,
    },
  };
}

/** Layout for a 5-minute rotation window (cached per index). */
export function getHomepageExposureLayout(rotationIndex = fiveMinuteIndex()): HomepageExposureLayout {
  const cached = layoutCache.get(rotationIndex);
  if (cached) return cached;
  const layout = buildLayout(rotationIndex);
  layoutCache.set(rotationIndex, layout);
  // Keep cache small
  if (layoutCache.size > 4) {
    const oldest = [...layoutCache.keys()].sort((a, b) => a - b)[0];
    if (oldest !== undefined) layoutCache.delete(oldest);
  }
  return layout;
}

/** SSR / first paint — same 5-minute window as client (hydration-safe). */
export function getHomepageExposureLayoutStatic(): HomepageExposureLayout {
  return getHomepageExposureLayout(fiveMinuteIndex());
}

/** Validate uniqueness for tests / audits. */
export function auditHomepageExposure(layout: HomepageExposureLayout): {
  duplicateArtists: string[];
  duplicateTracks: string[];
  duplicateSets: string[];
  ok: boolean;
} {
  const majorSections: { name: string; slugs: string[] }[] = [
    { name: "artistOfWeek", slugs: [layout.artistOfWeek.slug] },
    { name: "discovery", slugs: [layout.discovery.artist.slug] },
    { name: "essentialSet", slugs: [layout.essentialSet.artistSlug] },
    { name: "trendingViewed", slugs: layout.trendingViewed.map((a) => a.slug) },
    { name: "trendingSaved", slugs: layout.trendingSaved.map((a) => a.slug) },
    { name: "mostSaved", slugs: layout.mostSaved.map((a) => a.slug) },
    { name: "weeklyArtists", slugs: layout.weeklyArtists.map((a) => a.slug) },
    { name: "communityDiscussed", slugs: layout.communityDiscussed.map((a) => a.slug) },
  ];

  const majorCounts = new Map<string, string[]>();
  for (const section of majorSections) {
    for (const slug of section.slugs) {
      const list = majorCounts.get(slug) ?? [];
      list.push(section.name);
      majorCounts.set(slug, list);
    }
  }
  const duplicateArtists = [...majorCounts.entries()]
    .filter(([, sections]) => sections.length > 1)
    .map(([slug, sections]) => `${slug} → ${sections.join(", ")}`);

  const trackIds = [
    ...layout.weeklyTracks.map((t) => t.id),
    layout.discovery.track.id,
  ];
  const duplicateTracks = trackIds.filter((id, i) => trackIds.indexOf(id) !== i);

  const setIds = [
    layout.essentialSet.id,
    layout.discovery.set.id,
    ...layout.horBerlin.map((s) => s.id),
    ...layout.weeklySets.map((s) => s.id),
    ...layout.communitySets.map((s) => s.id),
  ];
  const duplicateSets = setIds.filter((id, i) => setIds.indexOf(id) !== i);

  return {
    duplicateArtists,
    duplicateTracks,
    duplicateSets,
    ok: duplicateArtists.length === 0 && duplicateTracks.length === 0 && duplicateSets.length === 0,
  };
}
