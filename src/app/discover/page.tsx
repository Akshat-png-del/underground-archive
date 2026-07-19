import { redirect } from "next/navigation";

/** Discover merged into Artists — permanent redirect. */
export default async function DiscoverRedirect({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; q?: string }>;
}) {
  const params = await searchParams;
  if (params.q?.trim()) {
    redirect(`/search?q=${encodeURIComponent(params.q.trim())}`);
  }
  if (params.genre?.trim()) {
    redirect(`/artists?genre=${encodeURIComponent(params.genre.trim())}`);
  }
  redirect("/artists");
}
