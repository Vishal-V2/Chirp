import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type ViewerProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * The signed-in user for this request (cached per request).
 * `profile` is null until they finish onboarding.
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const profile: ViewerProfile | null = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });

  return { userId: claims.sub, email: claims.email as string | undefined, profile };
});
