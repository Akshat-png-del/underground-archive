"use client";

import { useEffect } from "react";
import { useLibrary } from "@/context/LibraryContext";

export function RecordView({ type, refId }: { type: "artist" | "set" | "track"; refId: string }) {
  const { recordView, ready } = useLibrary();

  useEffect(() => {
    if (!ready) return;
    recordView(type, refId);
  }, [ready, recordView, type, refId]);

  return null;
}
