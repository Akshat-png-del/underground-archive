export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-accent/20 bg-surface/30">
      <div className="border-b border-border bg-surface px-4 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
          Internal — not indexed
        </p>
      </div>
      {children}
    </div>
  );
}
