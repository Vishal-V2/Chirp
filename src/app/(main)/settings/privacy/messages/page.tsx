import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { DmPolicySetting } from "@/components/settings/dm-policy-setting";

export const metadata: Metadata = { title: "Who can message you" };

export default function DirectMessagesSettingsPage() {
  return (
    <>
      <PageHeader back title="Who can message you" />
      <DmPolicySetting />
      <p className="px-4 pt-2 text-[13px] text-muted-foreground">
        Message requests wait in your inbox until you accept, delete or block
        them, and don&apos;t ping you. Chats you&apos;ve already accepted keep
        working whatever you choose.
      </p>
    </>
  );
}
