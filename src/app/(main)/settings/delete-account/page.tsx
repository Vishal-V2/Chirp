import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeleteAccountView } from "@/components/settings/delete-account";
import { deletionCheck } from "@/lib/account-deletion";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Delete account" };

export default async function DeleteAccountPage() {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (
    <DeleteAccountView
      check={deletionCheck(data?.claims)}
      username={viewer.profile.username}
    />
  );
}
