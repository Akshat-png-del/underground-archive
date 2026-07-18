import type { ArchiveSet, SetCategory } from "@/types/library";

/** Professional set collections — every verified set maps to exactly one. */
export const setCategoryLabels: Record<SetCategory, string> = {
  "hor-berlin": "HÖR Berlin",
  "boiler-room": "Boiler Room",
  awakenings: "Awakenings",
  verknipt: "Verknipt",
  teletech: "Teletech",
  intercell: "Intercell",
  "vault-sessions": "Vault Sessions",
  possession: "Possession",
  kntxt: "KNTXT",
  "stone-techno": "Stone Techno",
  "festival-sets": "Festival Sets",
  "warehouse-sessions": "Warehouse Sessions",
};

/** Display order for archive browsing (premium brands first). */
export const SET_COLLECTION_ORDER: readonly SetCategory[] = [
  "hor-berlin",
  "boiler-room",
  "awakenings",
  "verknipt",
  "teletech",
  "intercell",
  "vault-sessions",
  "possession",
  "kntxt",
  "stone-techno",
  "festival-sets",
  "warehouse-sessions",
] as const;

export const setCollectionDescriptions: Record<SetCategory, string> = {
  "hor-berlin": "Official HÖR Berlin long-form performances.",
  "boiler-room": "Official Boiler Room broadcasts and festival takeovers.",
  awakenings: "Awakenings stages and festival floors.",
  verknipt: "Verknipt arena and festival sessions.",
  teletech: "Teletech collective performances.",
  intercell: "Intercell showcases and all-night closings.",
  "vault-sessions": "Vault Sessions long-form recordings.",
  possession: "Possession nights and label showcases.",
  kntxt: "KNTXT label and Charlotte de Witte stage sessions.",
  "stone-techno": "Stone Techno Festival performances.",
  "festival-sets": "Tomorrowland, Time Warp, EXIT, Dekmantel, and major festival stages.",
  "warehouse-sessions": "Independent long-form warehouse and club performances.",
};

export type DurationBucket = "any" | "10-45" | "45-75" | "75-120" | "120+";

export const DURATION_BUCKET_LABELS: Record<DurationBucket, string> = {
  any: "Any length",
  "10-45": "10–45 min",
  "45-75": "45–75 min",
  "75-120": "75–120 min",
  "120+": "2h+",
};

export interface SetArchiveFilters {
  collection?: SetCategory | "all";
  artistSlug?: string | "all";
  year?: number | "all";
  event?: string | "all";
  duration?: DurationBucket;
}

/** Parse verified duration display strings like `1:29:35` or `58:12` into minutes. */
export function durationToMinutes(duration: string | undefined): number | null {
  if (!duration) return null;
  const parts = duration.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return null;
}

function matchesDurationBucket(duration: string | undefined, bucket: DurationBucket): boolean {
  if (bucket === "any") return true;
  const minutes = durationToMinutes(duration);
  if (minutes === null) return false;
  switch (bucket) {
    case "10-45":
      return minutes >= 10 && minutes < 45;
    case "45-75":
      return minutes >= 45 && minutes < 75;
    case "75-120":
      return minutes >= 75 && minutes < 120;
    case "120+":
      return minutes >= 120;
    default:
      return true;
  }
}

/**
 * Infer exactly one primary collection from verified venue + title metadata.
 * Brand institutions win over festival/warehouse catch-alls. Never invent venues.
 */
export function inferSetCollection(venue: string, title: string): SetCategory {
  const raw = `${venue} ${title}`.toLowerCase();
  const v = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Brand institutions (most specific first)
  if (raw.includes("hör") || v.includes("hor berlin") || /(^|[^a-z])hor([^a-z]|$)/.test(v)) {
    return "hor-berlin";
  }
  if (v.includes("boiler room")) return "boiler-room";
  if (v.includes("verknipt")) return "verknipt";
  if (v.includes("intercell")) return "intercell";
  if (v.includes("possession")) return "possession";
  if (v.includes("vault sessions") || v.includes("vault session")) return "vault-sessions";
  if (/\bkntxt\b/.test(v)) return "kntxt";
  if (v.includes("stone techno")) return "stone-techno";
  if (v.includes("teletech")) return "teletech";
  if (v.includes("awakenings")) return "awakenings";

  // Major festivals (not already covered by a brand stage above)
  if (
    v.includes("tomorrowland") ||
    v.includes("time warp") ||
    v.includes("exit festival") ||
    v.includes("dekmantel") ||
    v.includes("rotterdam rave") ||
    v.includes("monegros") ||
    v.includes("glitch festival") ||
    v.includes("bonusz")
  ) {
    return "festival-sets";
  }

  // Independent warehouse / club long-form
  if (
    v.includes("gotec") ||
    v.includes("unreal") ||
    v.includes("exhale") ||
    v.includes("terminal v") ||
    v.includes("junkyard") ||
    v.includes("warehouse") ||
    v.includes("bootshaus")
  ) {
    return "warehouse-sessions";
  }

  return "warehouse-sessions";
}

export function filterArchiveSets(
  sets: ArchiveSet[],
  filters: SetArchiveFilters,
): ArchiveSet[] {
  return sets.filter((set) => {
    if (filters.collection && filters.collection !== "all" && set.category !== filters.collection) {
      return false;
    }
    if (filters.artistSlug && filters.artistSlug !== "all" && set.artistSlug !== filters.artistSlug) {
      return false;
    }
    if (filters.year && filters.year !== "all") {
      const year = parseInt(set.date.slice(0, 4), 10);
      if (year !== filters.year) return false;
    }
    if (filters.event && filters.event !== "all" && set.event !== filters.event) {
      return false;
    }
    if (filters.duration && !matchesDurationBucket(set.duration, filters.duration)) {
      return false;
    }
    return true;
  });
}

export function getSetFilterOptions(sets: ArchiveSet[]) {
  const artists = [...new Map(sets.map((s) => [s.artistSlug, s.artistName])).entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  const years = [
    ...new Set(sets.map((s) => parseInt(s.date.slice(0, 4), 10)).filter((y) => !Number.isNaN(y))),
  ].sort((a, b) => b - a);

  const events = [...new Set(sets.map((s) => s.event).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );

  const collections = getVisibleSetCollections(sets);

  return { artists, years, events, collections };
}

/**
 * Collections with at least one set in the provided archive.
 * Empty collections (e.g. Vault Sessions / Possession / KNTXT with 0 sets) stay defined
 * in the taxonomy but must not render in the UI.
 */
export function getVisibleSetCollections(sets: ArchiveSet[]): SetCategory[] {
  const present = new Set(sets.map((s) => s.category));
  return SET_COLLECTION_ORDER.filter((c) => present.has(c));
}
