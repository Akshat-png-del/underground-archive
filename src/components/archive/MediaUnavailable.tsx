"use client";

import { ARCHIVED_CONTENT_LABEL } from "@/lib/archive/pipeline/constants";

export function MediaUnavailable({ label = ARCHIVED_CONTENT_LABEL }: { label?: string }) {
  return (
    <div className="flex aspect-video items-center justify-center border border-border bg-surface p-6 text-center">
      <p className="text-sm text-muted-light">{label}</p>
    </div>
  );
}
