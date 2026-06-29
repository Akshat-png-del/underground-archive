"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  ArtistQARow,
  QADashboardData,
  QADashboardFilter,
} from "@/lib/archive/qa-dashboard-types";
import { filterQARows, imageStatusLabel } from "@/lib/archive/qa-dashboard-types";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { formatDisplayDateTime } from "@/lib/format";

interface Props {
  initialData: QADashboardData;
}

const FILTERS: { id: QADashboardFilter; label: string }[] = [
  { id: "all", label: "All artists" },
  { id: "missingImages", label: "Missing images" },
  { id: "missingSets", label: "Missing sets" },
  { id: "missingBiographies", label: "Missing biographies" },
  { id: "brokenLinks", label: "Broken links" },
  { id: "tier1Only", label: "Tier 1 only" },
  { id: "suspiciousMedia", label: "Suspicious media" },
];

function StatCard({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="border border-border bg-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 font-serif text-2xl ${warn ? "text-danger" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function completenessColor(score: number): string {
  if (score >= 90) return "text-accent";
  if (score >= 70) return "text-foreground";
  return "text-danger";
}

export function ArchiveAuditDashboard({ initialData }: Props) {
  const [filter, setFilter] = useState<QADashboardFilter>("all");
  const [rows, setRows] = useState(initialData.artists);
  const [promotedSlugs, setPromotedSlugs] = useState<Set<string>>(
    () => new Set(initialData.artists.filter((r) => r.promoted).map((r) => r.slug))
  );
  const [promoting, setPromoting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => filterQARows(rows, filter), [rows, filter]);
  const { summary } = initialData;

  async function promote(slug: string) {
    setPromoting(slug);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/promote-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Promotion failed");
        return;
      }
      setPromotedSlugs((prev) => new Set([...prev, slug]));
      setRows((prev) =>
        prev.map((r) =>
          r.slug === slug ? { ...r, tier: 1 as const, promoted: true, verificationStatus: "verified" } : r
        )
      );
      setMessage(data.message ?? "Promoted — refresh after rebuild for full pipeline apply.");
    } catch {
      setMessage("Network error");
    } finally {
      setPromoting(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Archive QA</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground sm:text-4xl">Quality dashboard</h1>
          <p className="mt-2 text-sm text-muted-light">
            Generated {formatDisplayDateTime(initialData.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="border border-accent/40 bg-accent/5 px-5 py-3 text-center">
            <p className="font-mono text-[10px] uppercase text-muted">Quality score</p>
            <p className={`font-serif text-4xl ${completenessColor(summary.qualityScore)}`}>
              {summary.qualityScore}%
            </p>
            <p className="text-xs text-muted">complete</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </header>

      {message && (
        <p className="border border-border bg-surface px-4 py-3 text-sm text-muted-light">{message}</p>
      )}

      <section>
        <h2 className="font-serif text-xl text-foreground">Overview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total artists" value={summary.totalArtists} />
          <StatCard label="Tier 1" value={summary.tier1} />
          <StatCard label="Tier 2" value={summary.tier2} />
          <StatCard label="Tier 3" value={summary.tier3} />
          <StatCard label="Missing images" value={summary.missingImages} warn={summary.missingImages > 0} />
          <StatCard label="Missing sets" value={summary.missingSets} warn={summary.missingSets > 0} />
          <StatCard label="Missing tracks" value={summary.missingTracks} warn={summary.missingTracks > 0} />
          <StatCard label="Missing biographies" value={summary.missingBiographies} warn={summary.missingBiographies > 0} />
          <StatCard label="Broken YouTube" value={summary.brokenYoutube} warn={summary.brokenYoutube > 0} />
          <StatCard label="Broken Spotify" value={summary.brokenSpotify} warn={summary.brokenSpotify > 0} />
          <StatCard label="Duplicate artists" value={summary.duplicateArtists} warn={summary.duplicateArtists > 0} />
          <StatCard label="Suspicious media" value={summary.suspiciousMedia} warn={summary.suspiciousMedia > 0} />
          <StatCard label="Verified photos" value={summary.verifiedImages} />
          <StatCard label="Display portraits" value={`${summary.imageCoveragePercent}%`} />
          <StatCard label="Suspicious photos" value={summary.suspiciousImages} warn={summary.suspiciousImages > 0} />
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl text-foreground">Filters</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`chip-selectable border px-3 py-1.5 text-sm transition-colors ${
                filter === f.id
                  ? "is-selected border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-light hover:border-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          Showing {filtered.length} of {rows.length} artists
        </p>
      </section>

      <section className="overflow-x-auto border border-border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-surface font-mono text-[10px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 w-14">Photo</th>
              <th className="px-4 py-3">Artist</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Image</th>
              <th className="px-4 py-3">Tracks</th>
              <th className="px-4 py-3">Sets</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Complete</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <ArtistRow
                key={row.slug}
                row={row}
                promoted={promotedSlugs.has(row.slug)}
                promoting={promoting === row.slug}
                onPromote={promote}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-muted-light">No artists match this filter.</p>
        )}
      </section>

      {initialData.duplicateSlugs.length > 0 && (
        <section className="border border-danger/40 bg-danger/5 p-4">
          <h2 className="font-serif text-lg text-danger">Duplicate slugs</h2>
          <p className="mt-2 font-mono text-sm text-muted-light">
            {initialData.duplicateSlugs.join(", ")}
          </p>
        </section>
      )}
    </div>
  );
}

function ArtistRow({
  row,
  promoted,
  promoting,
  onPromote,
}: {
  row: ArtistQARow;
  promoted: boolean;
  promoting: boolean;
  onPromote: (slug: string) => void;
}) {
  const flags = [
    row.flags.missingImage && "no image",
    row.flags.missingSets && "no sets",
    row.flags.missingTracks && "no tracks",
    row.flags.missingBio && "no bio",
    row.flags.brokenSpotify && "spotify",
    row.flags.brokenYoutube && "youtube",
    row.flags.suspiciousMedia && "suspicious",
    row.flags.isDuplicate && "duplicate",
  ].filter(Boolean);

  const displayTier = promoted ? 1 : row.tier;

  return (
    <tr className="border-b border-border/60 hover:bg-surface/50">
      <td className="px-4 py-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-sm border border-border bg-surface">
          <SafeImage
            src={row.portraitUrl}
            alt=""
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <Link href={`/artists/${row.slug}`} className="font-medium text-foreground hover:text-accent">
          {row.name}
        </Link>
        <p className="font-mono text-xs text-muted">{row.slug}</p>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-accent">T{displayTier}</span>
        {promoted && <span className="ml-1 text-xs text-muted">↑</span>}
      </td>
      <td className="px-4 py-3 text-muted-light">{imageStatusLabel(row.imageStatus)}</td>
      <td className="px-4 py-3 font-mono">{row.trackCount}</td>
      <td className="px-4 py-3 font-mono">{row.setCount}</td>
      <td className="px-4 py-3 text-muted-light">{row.verificationStatus}</td>
      <td className={`px-4 py-3 font-mono ${completenessColor(row.completeness)}`}>
        {row.completeness}%
      </td>
      <td className="px-4 py-3">
        {flags.length === 0 ? (
          <span className="text-muted">—</span>
        ) : (
          <span className="text-xs text-danger">{flags.join(", ")}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {row.tier === 2 && !promoted && (
          <Button size="sm" variant="outline" disabled={promoting} onClick={() => onPromote(row.slug)}>
            {promoting ? "…" : "→ Tier 1"}
          </Button>
        )}
      </td>
    </tr>
  );
}
