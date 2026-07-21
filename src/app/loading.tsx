import { SectionLabel } from "@/components/ui/ArchivePrimitives";

export default function Loading() {
  return (
    <div
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center"
      role="status"
    >
      <SectionLabel>Loading archive</SectionLabel>
      <p className="mt-4 font-serif text-3xl text-foreground">Retrieving records</p>
      <span className="sr-only">Loading</span>
    </div>
  );
}
