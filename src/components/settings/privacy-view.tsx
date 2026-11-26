"use client";

import { Ban, Mail, VolumeX } from "lucide-react";
import { useQuery } from "urql";
import { PageHeader } from "@/components/layout/page-header";
import { SafetyListsQuery } from "@/graphql/client/users";
import { SettingsRow } from "./settings-row";
import { DmPolicyQuery } from "@/graphql/client/messages";
import { POLICY_LABEL } from "./dm-policy-setting";

/** Settings → Privacy and safety. */
export function PrivacyView() {
  const [{ data }] = useQuery({
    query: SafetyListsQuery,
    requestPolicy: "cache-and-network",
  });
  const [{ data: dm }] = useQuery({ query: DmPolicyQuery });
  const policy = dm?.me?.dmPolicy;
  return (
    <>
      <PageHeader back title="Privacy and safety" />
      <p className="px-4 pt-3 pb-2 text-[13px] text-muted-foreground">
        Manage who you see on Chirp and who can interact with you or message
        you.
      </p>
      <h2 className="px-4 pt-3 pb-1 font-heading text-xl font-bold tracking-tight">
        Mute and block
      </h2>
      <SettingsRow
        href="/settings/privacy/muted"
        icon={VolumeX}
        label="Muted accounts"
        hint="Accounts whose chirps and notifications you don't see."
        count={data?.mutedAccounts.length}
      />
      <SettingsRow
        href="/settings/privacy/blocked"
        icon={Ban}
        label="Blocked accounts"
        hint="Accounts that can't follow, reply to or message you."
        count={data?.blockedAccounts.length}
      />
      <h2 className="px-4 pt-5 pb-1 font-heading text-xl font-bold tracking-tight">
        Direct messages
      </h2>
      <SettingsRow
        href="/settings/privacy/messages"
        icon={Mail}
        label="Messages and read receipts"
        hint={
          policy ? `Allow messages from: ${POLICY_LABEL[policy]}` : undefined
        }
      />
    </>
  );
}
