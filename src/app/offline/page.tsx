import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold text-foreground">You&apos;re offline</h1>
      <p className="mt-3 text-muted">
        You&apos;re offline. Reconnect to continue discovering underground culture.
      </p>
      <Link href="/" className="mt-6 inline-block">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
