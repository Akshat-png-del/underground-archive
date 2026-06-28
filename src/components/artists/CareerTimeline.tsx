interface CareerTimelineProps {
  events: { year: number; event: string }[];
}

export function CareerTimeline({ events }: CareerTimelineProps) {
  const sorted = [...events].sort((a, b) => a.year - b.year);

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-8">
        {sorted.map((item, i) => (
          <div
            key={`${item.year}-${item.event}`}
            className="relative pl-8 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="absolute left-0 top-1.5 h-2 w-2 -translate-x-[3.5px] bg-accent shadow-[0_0_8px_rgba(200,255,0,0.5)]" />
            <p className="font-mono text-sm text-accent">{item.year}</p>
            <p className="mt-1 text-muted-light leading-relaxed">{item.event}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
