"use client";

import { SectionLabel } from "@/components/ui/ArchivePrimitives";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <SectionLabel>Archive interruption</SectionLabel>
      <h1 className="mt-4 font-serif text-4xl text-foreground">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted-light">
        This page could not be loaded. Try again to reconnect with the archive.
      </p>
      <div className="mt-8">
        <Button onClick={unstable_retry}>Try again</Button>
      </div>
    </div>
  );
}
