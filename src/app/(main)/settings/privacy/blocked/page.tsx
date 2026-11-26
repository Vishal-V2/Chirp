import type { Metadata } from "next";
import { SafetyListView } from "@/components/settings/safety-list-view";

export const metadata: Metadata = { title: "Blocked accounts" };

export default function BlockedAccountsPage() {
  return <SafetyListView kind="blocked" />;
}
