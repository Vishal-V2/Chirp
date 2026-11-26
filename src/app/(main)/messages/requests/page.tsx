import type { Metadata } from "next";
import { InboxView } from "@/components/messages/inbox-view";

export const metadata: Metadata = { title: "Message requests" };

export default function MessageRequestsPage() {
  return <InboxView requests />;
}
