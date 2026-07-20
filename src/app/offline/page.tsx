import { buildMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/Button";

export const metadata = buildMetadata({
  title: "Offline",
  description: "You're offline. Reconnect to continue discovering underground culture.",
  path: "/offline",
  noIndex: true,
});

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold text-foreground">You&apos;re offline</h1>
      <p className="mt-3 text-muted">
        You&apos;re offline. Reconnect to continue discovering underground culture.
      </p>
      <div className="mt-6 inline-block">
        <Button href="/">Go Home</Button>
      </div>
    </div>
  );
}
