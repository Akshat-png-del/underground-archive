"use client";

import "./globals.css";
import { GrainOverlay, SectionLabel } from "@/components/ui/ArchivePrimitives";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-full bg-background text-foreground antialiased">
        <title>Something went wrong | The Underground Archive</title>
        <GrainOverlay />
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
          <SectionLabel>Archive unavailable</SectionLabel>
          <h1 className="mt-4 font-serif text-4xl text-foreground">Something went wrong</h1>
          <p className="mt-3 max-w-md text-muted-light">
            The archive could not be loaded. Try again to restore the page.
          </p>
          <div className="mt-8">
            <Button onClick={unstable_retry}>Try again</Button>
          </div>
        </main>
      </body>
    </html>
  );
}
