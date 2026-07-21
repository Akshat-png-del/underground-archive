import { SectionLabel } from "@/components/ui/ArchivePrimitives";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <SectionLabel>404 — Archive entry missing</SectionLabel>
      <h1 className="mt-4 font-serif text-4xl text-foreground">Page not found</h1>
      <p className="mt-3 max-w-md text-muted-light">
        The page you requested does not exist or has moved elsewhere in the archive.
      </p>
      <div className="mt-8">
        <Button href="/">Return home</Button>
      </div>
    </div>
  );
}
