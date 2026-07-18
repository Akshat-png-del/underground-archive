export function SocialBadge({ variant }: { variant: "trending" | "rising" | "saved" }) {
  const labels = {
    trending: "Trending",
    rising: "Rising Fast",
    saved: "Most Saved",
  };
  return (
    <span className="inline-flex items-center gap-1 border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
      {labels[variant]}
    </span>
  );
}
