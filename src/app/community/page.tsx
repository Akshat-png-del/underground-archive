import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/Button";

export const metadata = buildMetadata({
  title: "Community",
  description: "Community features coming soon — ratings, discussions, and collections.",
  path: "/community",
});

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h1 className="font-serif text-3xl text-foreground">Community</h1>
      <p className="mx-auto mt-4 max-w-md text-muted-light">
        Profiles, ratings, and discussions are coming soon. Explore artists and sets in the meantime.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/artists"><Button>Browse artists</Button></Link>
        <Link href="/sets"><Button variant="outline">Browse sets</Button></Link>
      </div>
    </div>
  );
}
