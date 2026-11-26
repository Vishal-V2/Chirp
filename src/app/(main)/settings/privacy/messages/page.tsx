import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { DmPolicySetting } from "@/components/settings/dm-policy-setting";
import { ReadReceiptsSetting } from "@/components/settings/read-receipts-setting";

export const metadata: Metadata = { title: "Direct messages" };

export default function DirectMessagesSettingsPage() {
  return (
    <>
      <PageHeader back title="Direct messages" />
      <DmPolicySetting />
      <h2 className="px-4 pt-5 pb-1 font-heading text-xl font-bold tracking-tight">
        Read status
      </h2>
      <ReadReceiptsSetting />
      <p className="px-4 pt-2 text-[13px] text-muted-foreground">
        Message requests wait in your inbox until you accept, delete or block
        them, and don&apos;t ping you. Chats you&apos;ve already accepted keep
        working whatever you choose.
      </p>
    </>
  );
}
