"use client";

import { toast } from "sonner";
import { useMutation, useQuery } from "urql";
import type { DmPolicy } from "@/generated/gql/graphql";
import { DmPolicyQuery, SetDmPolicyMutation } from "@/graphql/client/messages";
import { cn } from "@/lib/utils";

const OPTIONS: { value: DmPolicy; label: string; hint: string }[] = [
  {
    value: "EVERYONE",
    label: "Everyone",
    hint: "Anyone can message you, straight into your inbox.",
  },
  {
    value: "FOLLOWING",
    label: "People you follow",
    hint: "People you follow go to your inbox; everyone else lands in Message requests.",
  },
  {
    value: "NOBODY",
    label: "No one",
    hint: "Only people you follow can message you. Everyone else is blocked.",
  },
];

/** Short names for each setting (shown on the Privacy and safety row). */
export const POLICY_LABEL: Record<DmPolicy, string> = {
  EVERYONE: "Everyone",
  FOLLOWING: "People you follow",
  NOBODY: "No one",
};

/** Settings → Privacy and safety → Who can message you. */
export function DmPolicySetting() {
  const [{ data }] = useQuery({ query: DmPolicyQuery });
  const [{ fetching }, save] = useMutation(SetDmPolicyMutation);
  const current = data?.me?.dmPolicy;

  return (
    <fieldset className="px-4 pt-3 pb-2" disabled={!current || fetching}>
      <legend className="px-0 pt-3 pb-2 font-heading text-xl font-bold tracking-tight">
        Allow messages from
      </legend>
      <div role="radiogroup" className="space-y-1">
        {OPTIONS.map((o) => {
          const checked = current === o.value;
          return (
            <label
              key={o.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
            >
              <input
                type="radio"
                name="dm-policy"
                value={o.value}
                checked={checked}
                onChange={async () => {
                  const r = await save({ policy: o.value });
                  if (r.error) toast.error("Couldn't save that setting.");
                  else toast.success(`Messages: ${o.label}`);
                }}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  checked ? "border-primary" : "border-muted-foreground/50",
                )}
              >
                {checked && (
                  <span className="size-2.5 rounded-full bg-primary" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px]">{o.label}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {o.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
