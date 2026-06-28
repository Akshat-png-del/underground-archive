import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Discovery Engine",
  description:
    "Filter underground artists by genre, country, BPM, and mood.",
  path: "/discover",
});

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
