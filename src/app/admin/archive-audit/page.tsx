import type { Metadata } from "next";
import { runQADashboard } from "@/lib/archive/qa-dashboard";
import { ArchiveAuditDashboard } from "@/components/admin/ArchiveAuditDashboard";

export const metadata: Metadata = {
  title: "Archive QA — Internal",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function ArchiveAuditAdminPage() {
  const data = runQADashboard();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <ArchiveAuditDashboard initialData={data} />
    </div>
  );
}
