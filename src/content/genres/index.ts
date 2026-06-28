import type { Genre } from "@/types";
import { artists, genreLabels, moodLabels } from "@/content/artists";
import { catalogTracks } from "@/content/tracks";
import { archiveSets } from "@/content/sets";
import { getArticlesBySlugs } from "@/content/editorial";

export interface GenreTimelineEvent {
  year: number;
  label: string;
  description: string;
}

export interface GenreGuide {
  slug: string;
  seoIntro: string;
  origins: {
    country: string;
    city: string;
    decade: string;
    context: string;
  };
  timeline: GenreTimelineEvent[];
  sound: {
    bpmRange: [number, number];
    atmosphere: string;
    intensity: string;
    rhythm: string;
    soundDesign: string;
  };
  moodTags: string[];
  essentialLabels: string[];
  essentialClubs: string[];
  relatedGenres: Genre[];
  relatedArticleSlugs: string[];
}

const guides: Record<string, GenreGuide> = {
  "hard-techno": {
    slug: "hard-techno",
    seoIntro:
      "Hard techno is warehouse endurance music — distorted kicks, industrial percussion, and tempos that refuse to compromise. From Berlin basements to global festival stages, it is the sound of physical release at peak hour.",
    origins: {
      country: "Germany / Belgium",
      city: "Frankfurt · Berlin · Antwerp",
      decade: "1990s",
      context:
        "Born from gabber, schranz, and industrial techno after reunification-era raves. Warehouse culture demanded louder, faster, more aggressive sound systems.",
    },
    timeline: [
      { year: 1995, label: "Early roots", description: "Frankfurt and Belgian scenes push tempo and kick weight beyond classic techno." },
      { year: 2000, label: "Scene expansion", description: "Berlin clubs and Polish warehouses adopt hard techno as a distinct dialect." },
      { year: 2010, label: "Underground consolidation", description: "Labels like Kobosil's 44 and Mord define a new generation of producers." },
      { year: 2020, label: "Global mainstream growth", description: "Festivals, Boiler Room, and TikTok introduce hard techno to mass audiences." },
    ],
    sound: {
      bpmRange: [140, 160],
      atmosphere: "Relentless, euphoric-dark, physically demanding",
      intensity: "Maximum — built for peak-time and closing hours",
      rhythm: "Four-on-the-floor with layered percussion and distorted sub",
      soundDesign: "Heavy kicks, industrial FX, rave stabs, occasional vocals",
    },
    moodTags: ["aggressive", "fast-paced", "euphoric", "industrial"],
    essentialLabels: ["44 Label", "Mord Records", "Vault Records", "Lobster Theremin", "NineTimesNine", "Kobosil", "Rave Alert", "HOR", "Mutual Rytm", "Ostgut Ton"],
    essentialClubs: ["Berghain", "Tresor", "RADION Amsterdam", "FOLD London", "Griessmuehle"],
    relatedGenres: ["schranz", "industrial-techno", "peak-time-techno", "acid-techno"],
    relatedArticleSlugs: ["best-hard-techno-artists-2026", "beginners-guide-to-hard-techno", "hard-techno-vs-industrial-techno", "evolution-of-hard-techno"],
  },
  schranz: {
    slug: "schranz",
    seoIntro:
      "Schranz is loop-driven hypnosis — metallic percussion, minimal variation, and German engineering for the dancefloor. The name was dismissive; the sound became legendary.",
    origins: { country: "Germany", city: "Frankfurt", decade: "1990s", context: "Chris Liebing and DJ Rush embraced 'Schranz' as a badge of honor against minimal techno's intellectualism." },
    timeline: [
      { year: 1997, label: "Term coined", description: "Frankfurt scene names the sound — noise, loops, endurance." },
      { year: 2003, label: "Peak schranz", description: "European warehouses run 140–150 BPM loop marathons." },
      { year: 2015, label: "Quiet years", description: "Scene fragments as hard techno absorbs schranz elements." },
      { year: 2022, label: "Global revival", description: "Regal, Kobosil, and VTSS reintroduce loop-driven energy." },
    ],
    sound: {
      bpmRange: [140, 150],
      atmosphere: "Hypnotic, metallic, punishing",
      intensity: "High — minimal variation by design",
      rhythm: "Relentless 4/4 loops with industrial percussion layers",
      soundDesign: "Distorted hi-hats, compressed kicks, factory textures",
    },
    moodTags: ["hypnotic", "aggressive", "industrial", "fast-paced"],
    essentialLabels: ["CLR", "GTO Records", "Planet Rhythm", "Mord", "Kobosil 44"],
    essentialClubs: ["O25 Frankfurt", "Tresor", "Griessmuehle", "Khidi Tbilisi", "Revier Südost"],
    relatedGenres: ["hard-techno", "industrial-techno", "peak-time-techno"],
    relatedArticleSlugs: ["what-is-schranz", "best-hard-techno-artists-2026"],
  },
  "industrial-techno": {
    slug: "industrial-techno",
    seoIntro: "Industrial techno merges factory aesthetics with dancefloor function — dystopian atmospheres, distorted textures, and the weight of machinery in every kick.",
    origins: { country: "Germany / UK", city: "Berlin · Birmingham", decade: "1990s", context: "EBM and Birmingham techno converge in post-reunification Berlin warehouses and Tresor's vault." },
    timeline: [
      { year: 1990, label: "EBM foundations", description: "Front 242 and Belgian body music influence techno producers." },
      { year: 2000, label: "Berlin industrial", description: "Tresor and Mord define dystopian warehouse sound." },
      { year: 2012, label: "French wave", description: "I Hate Models and Brutalism bring new aggression." },
      { year: 2020, label: "Dominant dialect", description: "Industrial becomes default language of global hard techno." },
    ],
    sound: {
      bpmRange: [130, 150],
      atmosphere: "Dystopian, cinematic, apocalyptic",
      intensity: "High — prioritizes texture over velocity",
      rhythm: "Syncopated industrial percussion with pounding kicks",
      soundDesign: "Distortion, metallic hits, noise sweeps, reverb-heavy atmospheres",
    },
    moodTags: ["industrial", "dark", "aggressive", "apocalyptic"],
    essentialLabels: ["Mord", "Ostgut Ton", "Perc Trax", "Taapion", "Kobosil 44", "Dement3d", "Stroboscopic Artefacts", "Soma", "Token", "Milestone"],
    essentialClubs: ["Berghain", "Tresor", " ://about blank", "OHM Berlin", "Concrete Paris"],
    relatedGenres: ["hard-techno", "dark-techno", "ebm", "industrial-ebm"],
    relatedArticleSlugs: ["history-of-industrial-techno", "top-industrial-techno-artists", "hard-techno-vs-industrial-techno"],
  },
  "acid-techno": {
    slug: "acid-techno",
    seoIntro: "Acid techno weaves 303 squelch through pounding kicks — psychedelic, punishing, and unmistakable on any sound system.",
    origins: { country: "United Kingdom", city: "London · Berlin", decade: "1990s", context: "Chicago acid house meets UK rave and Berlin warehouse culture." },
    timeline: [
      { year: 1987, label: "Acid house", description: "TB-303 squelch defines Chicago house." },
      { year: 1995, label: "UK acid techno", description: "London squat parties and Liberator crews push acid into harder territory." },
      { year: 2010, label: "Berlin acid", description: "Harder, faster acid lines enter Berghain and ://about blank." },
      { year: 2023, label: "Neo-acid hard", description: "999999999 and alignment fuse acid with hard techno structures." },
    ],
    sound: {
      bpmRange: [135, 155],
      atmosphere: "Psychedelic, hypnotic, raw",
      intensity: "High — 303 lines drive the energy",
      rhythm: "Four-on-the-floor with resonant acid sequences",
      soundDesign: "TB-303/clone squelch, distorted kicks, minimal melodic content",
    },
    moodTags: ["hypnotic", "euphoric", "fast-paced", "dark"],
    essentialLabels: ["Libertine", "Superconscious", "Molecular", "Superluminal", "Supernature"],
    essentialClubs: ["Fabric London", "FOLD", " ://about blank", "Khidi", "Griessmuehle"],
    relatedGenres: ["hard-techno", "peak-time-techno", "schranz"],
    relatedArticleSlugs: ["beginners-guide-to-hard-techno"],
  },
  "dark-techno": {
    slug: "dark-techno",
    seoIntro: "Dark techno prioritizes atmosphere and tension — slower builds, cinematic dread, and kicks that hit like concrete.",
    origins: { country: "Germany", city: "Berlin", decade: "2000s", context: "Post-minimal Berlin producers explore dystopian sound design without chasing festival BPM." },
    timeline: [
      { year: 2004, label: "Berghain era", description: "Marathon dark sets define a new listening mode." },
      { year: 2010, label: "Stroboscopic Artefacts", description: "Lucy, Kangding Ray, and cohort refine cinematic techno." },
      { year: 2018, label: "Warehouse dark", description: "Dark techno merges with industrial at faster tempos." },
      { year: 2024, label: "Global spread", description: "Dark rooms from Tbilisi to São Paulo adopt the aesthetic." },
    ],
    sound: {
      bpmRange: [125, 145],
      atmosphere: "Cinematic, claustrophobic, nocturnal",
      intensity: "Moderate-high — tension over velocity",
      rhythm: "Hypnotic grooves with subtle variation",
      soundDesign: "Reverb tails, dubby delays, muted percussion, heavy subs",
    },
    moodTags: ["dark", "hypnotic", "melancholic", "industrial"],
    essentialLabels: ["Stroboscopic Artefacts", "Token", "Milestone", "Dement3d", "Semantica", "Edit Select", "Dynamic Reflection", "Balans", "Non Series", "Rekids"],
    essentialClubs: ["Berghain", "Panorama Bar", "OHM", "About Blank", "Griessmuehle"],
    relatedGenres: ["industrial-techno", "darkwave", "hard-techno"],
    relatedArticleSlugs: ["history-of-industrial-techno"],
  },
  "peak-time-techno": {
    slug: "peak-time-techno",
    seoIntro: "Peak-time techno is built for the moment the room ignites — maximum energy, singalong moments, and kicks designed for hands in the air at 4am.",
    origins: { country: "Global", city: "Berlin · Paris · Manchester", decade: "2010s", context: "Festival main stages and Teletech-style events demand accessible, high-energy hard techno." },
    timeline: [
      { year: 2015, label: "Festival techno", description: "Awakenings and Verknipt scale hard sound to arenas." },
      { year: 2019, label: "Teletech wave", description: "UK collectives bring rave energy back to hard techno." },
      { year: 2022, label: "Global headliners", description: "Sara Landry, Klangkuenstler, Trym dominate festival bills." },
      { year: 2025, label: "Peak-time standard", description: "Peak-time becomes default festival programming language." },
    ],
    sound: {
      bpmRange: [145, 160],
      atmosphere: "Euphoric, aggressive, anthemic",
      intensity: "Maximum peak-hour energy",
      rhythm: "Driving 4/4 with rave stabs and crowd-ready drops",
      soundDesign: "Distorted kicks, vocal chops, trance-influenced leads",
    },
    moodTags: ["euphoric", "aggressive", "fast-paced", "apocalyptic"],
    essentialLabels: ["Teletech", "Vault", "NineTimesNine", "Lobster Theremin", "KNTXT", "Makina", "Filth on Acid", "Keep It On", "Rave Alert", "No Mercy"],
    essentialClubs: ["Berghain", "Printworks London", "Depot Mayfield", "Radion", "Nitsa Athens"],
    relatedGenres: ["hard-techno", "schranz", "acid-techno"],
    relatedArticleSlugs: ["best-boiler-room-hard-techno-sets", "best-hard-techno-artists-2026"],
  },
  ebm: {
    slug: "ebm",
    seoIntro: "Electronic Body Music — danceable industrial aggression from Front 242 to today's warehouse floors. Rhythm, vocals, and cold-wave energy.",
    origins: { country: "Belgium / UK", city: "Brussels · Sheffield", decade: "1980s", context: "Industrial music becomes danceable; body beats replace noise experiments." },
    timeline: [
      { year: 1981, label: "Front 242", description: "EBM coined as a genre and movement." },
      { year: 1988, label: "Second wave", description: "Nitzer Ebb and Skinny Puppy expand global reach." },
      { year: 2000, label: "Techno crossover", description: "EBM rhythms influence Berlin and Birmingham techno." },
      { year: 2020, label: "EBM revival", description: "Boy Harsher and Phase Fatale bridge EBM and modern club culture." },
    ],
    sound: {
      bpmRange: [120, 140],
      atmosphere: "Cold, militant, danceable",
      intensity: "Moderate — syncopation drives movement",
      rhythm: "Marching beats with shouted or processed vocals",
      soundDesign: "Sequenced basslines, drum machines, industrial samples",
    },
    moodTags: ["industrial", "aggressive", "dark", "melancholic"],
    essentialLabels: ["Mute", "Metropolis", "Ant-Zen", "Dependent", "Artoffact", "Cleopatra", "Alfa Matrix", "Out of Line", "Infacted", "Scanner"],
    essentialClubs: ["Berghain", "SO36 Berlin", "Diva Madrid", "Khidi", "Rote Sonne Munich"],
    relatedGenres: ["industrial-ebm", "darkwave", "industrial-techno"],
    relatedArticleSlugs: ["understanding-ebm", "history-of-industrial-techno"],
  },
  "industrial-ebm": {
    slug: "industrial-ebm",
    seoIntro: "Industrial EBM sits at the intersection of factory noise and body music — harder than classic EBM, more rhythmic than pure industrial.",
    origins: { country: "Germany / Belgium", city: "Berlin · Brussels", decade: "1980s–90s", context: "Post-industrial scenes merge EBM rhythms with harsher production." },
    timeline: [
      { year: 1985, label: "Body music peak", description: "Belgian and German acts define militant dance sound." },
      { year: 1995, label: "Techno crossover", description: "Rave culture absorbs EBM percussion patterns." },
      { year: 2015, label: "Modern revival", description: "New acts update cold-wave and EBM for club contexts." },
      { year: 2023, label: "Hard EBM", description: "Faster tempos merge EBM with hard techno rooms." },
    ],
    sound: {
      bpmRange: [125, 145],
      atmosphere: "Militant, cold, physical",
      intensity: "High — body and aggression combined",
      rhythm: "Syncopated industrial beats with vocal commands",
      soundDesign: "Distorted synths, sampled machinery, shouted vocals",
    },
    moodTags: ["industrial", "aggressive", "dark", "apocalyptic"],
    essentialLabels: ["Metropolis", "Ant-Zen", "Infacted", "Out of Line", "Alfa Matrix"],
    essentialClubs: ["Berghain", "Tresor", "SO36", "Khidi", "Gare Porto"],
    relatedGenres: ["ebm", "industrial-techno", "darkwave"],
    relatedArticleSlugs: ["understanding-ebm", "history-of-industrial-techno"],
  },
  darkwave: {
    slug: "darkwave",
    seoIntro: "Darkwave channels gothic melancholy through cold synths and driving rhythms — the emotional counterweight to hard techno's physical intensity.",
    origins: { country: "United Kingdom / Germany", city: "London · Berlin", decade: "1980s", context: "Post-punk bands adopt synthesizers; gothic clubs create parallel nightlife." },
    timeline: [
      { year: 1979, label: "Post-punk synths", description: "Joy Division and cohort establish cold electronic mood." },
      { year: 1985, label: "Gothic clubs", description: "Darkwave becomes club culture in UK and Germany." },
      { year: 2010, label: "Minimal wave", description: "Tape-era aesthetics return via reissue culture." },
      { year: 2020, label: "Modern darkwave", description: "She Past Away and Lebanon Hanover reach global audiences." },
    ],
    sound: {
      bpmRange: [110, 135],
      atmosphere: "Melancholic, cinematic, gothic",
      intensity: "Moderate — emotion over physical impact",
      rhythm: "Driving post-punk beats with arpeggiated synths",
      soundDesign: "Cold analog synths, reverb-heavy vocals, drum machines",
    },
    moodTags: ["dark", "melancholic", "hypnotic", "industrial"],
    essentialLabels: ["Fabrika", "Artoffact", "Dependent", "Metropolis", "Cleopatra"],
    essentialClubs: ["SO36", "Berghain (Säule)", "Khidi", "About Blank", "OHM"],
    relatedGenres: ["post-punk", "ebm", "industrial"],
    relatedArticleSlugs: ["origins-of-darkwave"],
  },
  "post-punk": {
    slug: "post-punk",
    seoIntro: "Post-punk's angular guitars and cold electronics laid groundwork for darkwave, EBM, and industrial club culture.",
    origins: { country: "United Kingdom", city: "Manchester · London", decade: "1970s", context: "Punk's energy meets art-school experimentation and electronic instruments." },
    timeline: [
      { year: 1977, label: "Punk fracture", description: "Bands explore dub, electronics, and art rock." },
      { year: 1979, label: "Factory era", description: "Joy Division defines Manchester's cold sound." },
      { year: 1982, label: "Gothic divergence", description: "Bauhaus and The Cure spawn gothic subculture." },
      { year: 2015, label: "Revival", description: "Drab Majesty and Lebanon Hanover update the aesthetic." },
    ],
    sound: {
      bpmRange: [100, 130],
      atmosphere: "Angular, melancholic, intellectual",
      intensity: "Moderate — tension and mood over BPM",
      rhythm: "Post-punk backbeats with bass-driven grooves",
      soundDesign: "Clean guitars, analog synths, dub-influenced production",
    },
    moodTags: ["melancholic", "dark", "hypnotic"],
    essentialLabels: ["Factory", "4AD", "Mute", "Rough Trade", "Fast Product"],
    essentialClubs: ["Hacienda (historic)", "SO36", "Berghain Säule", "Corsica Studios", "Printworks"],
    relatedGenres: ["darkwave", "ebm", "industrial"],
    relatedArticleSlugs: ["origins-of-darkwave"],
  },
  industrial: {
    slug: "industrial",
    seoIntro: "Industrial is the foundation — noise, machinery, and rhythm forged before techno existed. Every hard kick carries this lineage.",
    origins: { country: "United Kingdom", city: "London · Sheffield", decade: "1970s", context: "Throbbing Gristle and Cabaret Voltaire treat the factory as instrument." },
    timeline: [
      { year: 1976, label: "Industrial music", description: "Throbbing Gristle coins the term." },
      { year: 1985, label: "EBM emergence", description: "Industrial becomes danceable." },
      { year: 1995, label: "Techno fusion", description: "Berlin warehouses adopt industrial textures." },
      { year: 2020, label: "Dominant influence", description: "Industrial aesthetics define global hard techno." },
    ],
    sound: {
      bpmRange: [120, 150],
      atmosphere: "Dystopian, abrasive, experimental",
      intensity: "Variable — from noise to dancefloor",
      rhythm: "Irregular or pounding depending on era",
      soundDesign: "Samples, noise, distortion, non-musical textures",
    },
    moodTags: ["industrial", "apocalyptic", "dark", "aggressive"],
    essentialLabels: ["Industrial Records", "Mute", "Metropolis", "Ant-Zen", "Hands"],
    essentialClubs: ["Tresor", "Berghain", "Fabric", "Khidi", "Griessmuehle"],
    relatedGenres: ["industrial-techno", "ebm", "industrial-ebm"],
    relatedArticleSlugs: ["history-of-industrial-techno", "top-industrial-techno-artists"],
  },
  hardgroove: {
    slug: "hardgroove",
    seoIntro:
      "Hardgroove fuses breakbeat swing with hard techno pressure — rolling basslines, syncopated percussion, and peak-hour energy without losing underground grit.",
    origins: {
      country: "France / UK",
      city: "Paris · Manchester · Berlin",
      decade: "2020s",
      context:
        "French collectives and UK rave revival scenes push hard techno toward groove and funk without slowing down.",
    },
    timeline: [
      { year: 2019, label: "Early experiments", description: "Producers test breakbeat patterns inside 145+ BPM hard structures." },
      { year: 2021, label: "French wave", description: "Chlar, Hadone, and Funk Tribu define a distinct hardgroove dialect." },
      { year: 2023, label: "Mutual Rytm", description: "Labels and events codify hardgroove as a festival-ready subgenre." },
      { year: 2025, label: "Global spread", description: "Hardgroove enters main stages while retaining warehouse roots." },
    ],
    sound: {
      bpmRange: [145, 160],
      atmosphere: "Euphoric, physical, groove-forward",
      intensity: "High — built for peak time with rhythmic variation",
      rhythm: "Breakbeat-influenced patterns over distorted kicks",
      soundDesign: "Rolling bass, vocal chops, rave stabs, syncopated hi-hats",
    },
    moodTags: ["euphoric", "aggressive", "fast-paced", "hypnotic"],
    essentialLabels: ["Mutual Rytm", "Rave Alert", "Possession", "Tribu", "Filth on Acid", "Keep It On"],
    essentialClubs: ["Berghain", "Concrete Paris", "FOLD London", "Radion Amsterdam", "Printworks"],
    relatedGenres: ["hard-techno", "peak-time-techno", "acid-techno", "schranz"],
    relatedArticleSlugs: ["best-hard-techno-artists-2026", "beginners-guide-to-hard-techno"],
  },
  "hypnotic-techno": {
    slug: "hypnotic-techno",
    seoIntro:
      "Hypnotic techno treats repetition as a tool for trance — subtle modulation, long blends, and sound design that rewards patience over instant impact.",
    origins: {
      country: "Germany / Netherlands",
      city: "Berlin · Eindhoven · Oslo",
      decade: "2000s",
      context:
        "Post-minimal Berlin and Semantica-style producers explore depth through restraint rather than velocity.",
    },
    timeline: [
      { year: 2006, label: "Berlin hypnosis", description: "Marathon sets at Berghain define slow-build listening." },
      { year: 2012, label: "Semantica era", description: "Deepbass and cohort refine dark, immersive production." },
      { year: 2018, label: "Industrial crossover", description: "Hypnotic structures merge with darker industrial textures." },
      { year: 2024, label: "Global rooms", description: "Dedicated hypnotic rooms appear at festivals worldwide." },
    ],
    sound: {
      bpmRange: [125, 140],
      atmosphere: "Trance-inducing, immersive, nocturnal",
      intensity: "Moderate — tension through repetition",
      rhythm: "Steady 4/4 with micro-variation and long phrases",
      soundDesign: "Reverb tails, dubby delays, filtered percussion, subdued subs",
    },
    moodTags: ["hypnotic", "dark", "melancholic", "industrial"],
    essentialLabels: ["Semantica", "Stroboscopic Artefacts", "Mord", "Token", "Dynamic Reflection", "Non Series"],
    essentialClubs: ["Berghain", "OHM Berlin", " ://about blank", "Griessmuehle", "De School Amsterdam"],
    relatedGenres: ["dark-techno", "industrial-techno", "hard-techno"],
    relatedArticleSlugs: ["history-of-industrial-techno"],
  },
};

export function getGenreGuide(slug: string): GenreGuide | undefined {
  return guides[slug];
}

export function getGenreMeta(slug: string) {
  const guide = guides[slug];
  if (!guide) return undefined;
  return {
    seoIntro: guide.seoIntro,
    moodTags: guide.moodTags,
    relatedArticleSlugs: guide.relatedArticleSlugs,
  };
}

export function getGenreMoodLabels(slug: string): string[] {
  const guide = guides[slug];
  if (!guide) return [];
  return guide.moodTags.map((t) => moodLabels[t as keyof typeof moodLabels] ?? t);
}

export function getGenreEssentialArtists(slug: string, limit?: number) {
  const list = artists.filter((a) => a.genres.includes(slug as Genre));
  return limit ? list.slice(0, limit) : list;
}

export function getGenreEssentialTracks(slug: string, limit = 15) {
  return catalogTracks
    .filter((t) => {
      const artist = artists.find((a) => a.slug === t.artistSlug);
      return artist?.genres.includes(slug as Genre);
    })
    .slice(0, limit);
}

export function getGenreEssentialSets(slug: string, limit = 10) {
  return archiveSets.filter((s) => s.genres.includes(slug as Genre)).slice(0, limit);
}

export function getGenreRelatedArticles(slug: string) {
  const guide = guides[slug];
  if (!guide) return [];
  return getArticlesBySlugs(guide.relatedArticleSlugs);
}

export function getAllGenreGuides() {
  return Object.values(guides);
}

export { genreLabels };
