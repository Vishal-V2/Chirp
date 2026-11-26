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

  const row = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      deactivatedAt: true,
    },
  });
  const { deactivatedAt = null, ...rest } = row ?? {};
  const profile: ViewerProfile | null = row ? (rest as ViewerProfile) : null;

  // Google sign-ins carry the person's name; used to prefill onboarding.
  const meta = (claims.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
  };
  return {
    userId: claims.sub,
    email: claims.email as string | undefined,
    name: meta.full_name ?? meta.name,
    profile,
    /** Set while the account is deactivated (pending deletion). */
    deactivatedAt,
  };
});
