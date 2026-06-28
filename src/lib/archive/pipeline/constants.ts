/** Shown when media or links fail verification — never show wrong content. */
export const ARCHIVED_CONTENT_LABEL = "Content currently being archived.";

export const CONFIDENCE_THRESHOLD = 0.95;

/** Recognized official set sources only. */
export const ALLOWED_SET_VENUE_PATTERNS = [
  "boiler room",
  "hör berlin",
  "hor berlin",
  "hör",
  "intercell",
  "possession",
  "teletech",
  "stone techno",
  "awakenings",
  "time warp",
  "exhale",
  "dekmantel",
  "verknipt",
  "terminal v",
  "unreal",
  "rotterdam rave",
  "gotec",
] as const;

export const SPOTIFY_ARTIST_ID_PATTERN = /^[a-zA-Z0-9]{22}$/;
export const SPOTIFY_TRACK_ID_PATTERN = /^[a-zA-Z0-9]{22}$/;
export const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
