export const siteConfig = {
  name: "The Underground Archive",
  shortName: "Archive",
  tagline: "Discover underground electronic music",
  description:
    "Hard techno, schranz, industrial techno, EBM, and darkwave — artist profiles, essential sets, and editorial discovery.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
        })()
      : "http://localhost:3000"),
  // Branded default social card, generated at /opengraph-image (see src/app/opengraph-image.tsx).
  ogImage: "/opengraph-image",
  locale: "en_US",
  editorialEmail: "archive@underground.archive",
} as const;

export type SiteConfig = typeof siteConfig;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/artists", label: "Artists" },
  { href: "/sets", label: "Mixtapes" },
  { href: "/genres", label: "Genres" },
] as const;
