import { cn } from "@/lib/utils";

export function GrainOverlay({ className }: { className?: string }) {
  return <div className={cn("grain pointer-events-none fixed inset-0 z-50", className)} aria-hidden />;
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10px] uppercase tracking-[0.25em] text-accent", className)}>
      {children}
    </span>
  );
}

export function RatingBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="h-px w-full bg-border">
      <div
        className="h-px bg-accent transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-light">
      {children}
    </span>
  );
}
