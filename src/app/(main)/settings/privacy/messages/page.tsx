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
        Messages from people you don&apos;t follow go to Message requests in
        your inbox, where you can accept, delete or block them.
      </p>
    </>
  );
}
