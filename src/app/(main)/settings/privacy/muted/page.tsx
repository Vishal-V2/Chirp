import type { Metadata } from "next";
import { SafetyListView } from "@/components/settings/safety-list-view";

export const metadata: Metadata = { title: "Muted accounts" };

export default function MutedAccountsPage() {
  return <SafetyListView kind="muted" />;
}
