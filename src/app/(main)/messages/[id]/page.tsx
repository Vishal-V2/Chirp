import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatView } from "@/components/messages/chat-view";
import { getViewer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Messages" };

export default async function ConversationPage(
  props: PageProps<"/messages/[id]">,
) {
  const { id } = await props.params;
  const viewer = await getViewer();
  // Only participants can open a conversation; everyone else gets a 404.
  const isParticipant =
    viewer &&
    (await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId: viewer.userId },
      },
      select: { conversationId: true },
    }));
  if (!isParticipant) notFound();

  return <ChatView key={id} conversationId={id} />;
}
