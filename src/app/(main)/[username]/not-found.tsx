import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default function ProfileNotFound() {
  return (
    <>
      <PageHeader back title="Profile" />
      <div className="aspect-[3/1] bg-muted" />
      <div className="mx-auto max-w-sm px-8 py-12">
        <p className="text-3xl font-extrabold">This account doesn&apos;t exist</p>
        <p className="mt-2 text-muted-foreground">Try searching for another.</p>
        <Link
          href="/explore"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
        >
          Search
        </Link>
      </div>
    </>
  );
}
