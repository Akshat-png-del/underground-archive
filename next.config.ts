import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "**.scdn.co" },
      { protocol: "https", hostname: "**.spotifycdn.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "**.ggpht.com" },
      { protocol: "https", hostname: "**.discogs.com" },
      { protocol: "https", hostname: "**.discogs.net" },
      { protocol: "https", hostname: "coverartarchive.org" },
      { protocol: "https", hostname: "geo.brukcdn.com" },
      { protocol: "https", hostname: "**.beatport.com" },
      { protocol: "https", hostname: "images.ra.co" },
      { protocol: "https", hostname: "**.ra.co" },
    ],
  },
  poweredByHeader: false,
  compress: true,
  // Dev uses `next dev --webpack` (see package.json). Turbopack can serve stale PostCSS
  // output for append-only globals.css edits; webpack matches the production CSS pipeline.
};

export default withPWA(nextConfig);
