export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string;
  relatedSlugs?: string[];
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    slug: "schranz",
    term: "Schranz",
    definition:
      "A loop-driven subgenre of hard techno originating in Frankfurt. Characterized by relentless 4/4 patterns, metallic percussion, and minimal variation — designed for physical endurance on the dancefloor.",
    relatedSlugs: ["peak-time", "warehouse"],
  },
  {
    slug: "peak-time",
    term: "Peak Time",
    definition:
      "The highest-energy period of a club night or DJ set — typically 3am to 5am when the room is fullest and BPM and intensity reach their maximum.",
    relatedSlugs: ["closing-set", "warmup-set"],
  },
  {
    slug: "ebm",
    term: "EBM",
    definition:
      "Electronic Body Music — a genre emerging in the early 1980s combining industrial sounds with danceable rhythms. Front 242, Nitzer Ebb, and modern acts like Boy Harsher carry the lineage.",
  },
  {
    slug: "warehouse",
    term: "Warehouse",
    definition:
      "An unofficial or repurposed industrial space used for raves and club nights. Warehouse culture shaped Berlin after reunification and remains central to hard techno mythology.",
    relatedSlugs: ["schranz", "peak-time"],
  },
  {
    slug: "closing-set",
    term: "Closing Set",
    definition:
      "The final DJ performance before a venue shuts down — often marathon-length, emotionally charged, and reserved for the most trusted selectors.",
    relatedSlugs: ["warmup-set", "peak-time"],
  },
  {
    slug: "warmup-set",
    term: "Warmup Set",
    definition:
      "The opening DJ slot that builds energy gradually — lower BPM, more subtle selection, setting the room's trajectory for the night.",
    relatedSlugs: ["peak-time", "closing-set"],
  },
  {
    slug: "industrial",
    term: "Industrial",
    definition:
      "A genre and aesthetic born from Throbbing Gristle in 1976 — using factory sounds, noise, and machinery as musical material. Foundation of industrial techno and EBM.",
  },
  {
    slug: "hardgroove",
    term: "Hardgroove",
    definition:
      "A style emphasizing syncopated, funky percussion within hard techno tempos — bridging breakbeat energy with four-on-the-floor structure.",
  },
  {
    slug: "acid-line",
    term: "Acid Line",
    definition:
      "A squelching synthesizer sequence typically from a Roland TB-303 or clone — the defining element of acid house and acid techno.",
  },
  {
    slug: "live-set",
    term: "Live Set",
    definition:
      "A performance using hardware synthesizers, drum machines, or modular systems rather than DJing with records or files — often improvised and unique each time.",
  },
  {
    slug: "b2b",
    term: "B2B",
    definition:
      "Back-to-back — two or more DJs sharing the decks simultaneously, alternating track selection. Common at festivals and special club nights.",
  },
  {
    slug: "berghain",
    term: "Berghain",
    definition:
      "Berlin's most mythologized club — a former power plant hosting marathon techno sessions. Its door policy, no-photography rule, and sound system define global club culture.",
  },
  {
    slug: "boiler-room",
    term: "Boiler Room",
    definition:
      "A broadcast platform filming DJ sets in intimate spaces worldwide — instrumental in exposing underground hard techno to global audiences through YouTube.",
  },
];

export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return glossaryTerms.find((t) => t.slug === slug);
}
