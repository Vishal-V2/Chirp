import type { Metadata } from "next";
import { GroupInfoView } from "@/components/messages/group-info-view";

export const metadata: Metadata = { title: "Group info" };

export default async function GroupInfoPage(
  props: PageProps<"/messages/[id]/info">,
) {
  const { id } = await props.params;
  return <GroupInfoView conversationId={id} />;
}
