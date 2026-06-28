/** Cached catalog expansion — tracks and sets fetched by expand-catalog script. */
export interface ExpansionTrack {
  title: string;
  spotifyTrackId: string;
  year: number;
  duration: string;
}

export interface ExpansionSet {
  title: string;
  venue: string;
  year: number;
  youtubeId: string;
}

export interface CatalogExpansion {
  slug: string;
  tracks: ExpansionTrack[];
  sets: ExpansionSet[];
  updatedAt: string;
}
