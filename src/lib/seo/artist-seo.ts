import type { Artist } from "@/types";
import { genreLabels } from "@/content/artists";
import { getSetsByArtist } from "@/content/sets";
import { toSentenceList } from "@/content/hubs";
import type { FaqItem } from "@/components/seo/FaqSection";

/** Verified external profile URLs for schema.org `sameAs`. */
export function artistSameAs(artist: Artist): string[] {
  const { externalLinks: l } = artist;
  return [l.spotify, l.soundcloud, l.instagram, l.residentAdvisor, l.youtube].filter(
    (v): v is string => Boolean(v),
  );
}

/** FAQ items derived only from verified catalog data. */
export function buildArtistFaqs(artist: Artist): FaqItem[] {
  const genreNames = artist.genres.map((g) => genreLabels[g] || g);
  const sets = getSetsByArtist(artist.slug);
  const faqs: FaqItem[] = [
    {
      question: `What genre is ${artist.name}?`,
      answer: `${artist.name} is a ${toSentenceList(genreNames)} artist based in ${artist.city}, ${artist.country}, active since ${artist.activeSince}.`,
    },
  ];

  if (sets.length) {
    const top = sets.slice(0, 3).map((s) => `${s.title} (${s.event})`);
    faqs.push({
      question: `What are ${artist.name}'s essential sets?`,
      answer: `Verified ${artist.name} sets in the archive include ${toSentenceList(top)}.`,
    });
  }

  return faqs;
}
