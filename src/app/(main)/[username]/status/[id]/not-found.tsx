import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";

export default function TweetNotFound() {
  return (
    <>
      <PageHeader back title="Post" />
      <div className="mx-auto max-w-sm px-8 py-12">
        <p className="text-3xl font-extrabold">This post doesn&apos;t exist</p>
        <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
        >
          Back to home
        </Link>
      </div>
    </>
  );
}
