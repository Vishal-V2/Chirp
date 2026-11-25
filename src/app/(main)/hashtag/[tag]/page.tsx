import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HashtagView } from "@/components/explore/hashtag-view";
import { normalizeTag } from "@/lib/rich-text";

export async function generateMetadata(
  props: PageProps<"/hashtag/[tag]">,
): Promise<Metadata> {
  const { tag } = await props.params;
  return { title: `#${normalizeTag(tag)}` };
}

export default async function HashtagPage(props: PageProps<"/hashtag/[tag]">) {
  const { tag } = await props.params;
  const normalized = normalizeTag(tag);
  if (!normalized) notFound();
  return <HashtagView tag={normalized} />;
}
