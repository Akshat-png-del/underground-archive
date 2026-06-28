import { NextResponse } from "next/server";
import { promoteToTier1 } from "@/lib/archive/curation/tier-promotions-server";
import { getCurationTier } from "@/lib/archive/curation";
import { artists } from "@/content/artists/all";

export async function POST(request: Request) {
  const body = (await request.json()) as { slug?: string };
  const slug = body.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const artist = artists.find((a) => a.slug === slug);
  if (!artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  const currentTier = getCurationTier(slug);
  if (currentTier === 1) {
    return NextResponse.json({ error: "Artist is already tier 1" }, { status: 400 });
  }

  if (currentTier !== 2) {
    return NextResponse.json(
      { error: "Only tier 2 artists can be promoted via quick action" },
      { status: 400 }
    );
  }

  const promotions = promoteToTier1(slug);

  return NextResponse.json({
    ok: true,
    slug,
    promotedToTier1: promotions.promotedToTier1,
    message: `${artist.name} promoted to tier 1. Rebuild or refresh to apply pipeline changes.`,
  });
}
