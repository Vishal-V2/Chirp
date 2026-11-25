import type { Metadata } from "next";
import { ExploreView } from "@/components/explore/explore-view";

export async function generateMetadata(
  props: PageProps<"/explore">,
): Promise<Metadata> {
  const { q } = await props.searchParams;
  return {
    title:
      typeof q === "string" && q.trim() ? `${q.trim()} - Search` : "Explore",
  };
}

export default async function ExplorePage(props: PageProps<"/explore">) {
  const { q } = await props.searchParams;
  return (
    <ExploreView initialQuery={typeof q === "string" ? q.slice(0, 100) : ""} />
  );
}
