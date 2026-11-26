/** Deactivated accounts are deleted for good after this many days. */
export const DELETE_AFTER_DAYS = 5;

/** A Google re-check counts for this long. */
export const RECENT_SIGN_IN_MINUTES = 10;

/** When a deactivated account will be deleted. */
export const deletionDate = (deactivatedAt: Date) =>
  new Date(deactivatedAt.getTime() + DELETE_AFTER_DAYS * 86_400_000);

type Claims = {
  app_metadata?: { provider?: string; providers?: string[] };
  amr?: unknown[];
};

/**
 * How someone proves it's them before deactivating: their password, or (for
 * Google-only accounts, which have no password) a fresh Google sign-in.
 */
export function deletionCheck(jwt: object | null | undefined): {
  method: "password" | "google";
  recentGoogleSignIn: boolean;
} {
  const claims = jwt as Claims | null | undefined;
  const meta = claims?.app_metadata;
  const providers = meta?.providers ?? (meta?.provider ? [meta.provider] : []);
  const method = providers.includes("email") ? "password" : "google";
  // `amr` records how and when this session signed in.
  const lastOAuth = Math.max(
    0,
    ...(claims?.amr ?? []).flatMap((a) => {
      const entry = a as { method?: string; timestamp?: number };
      return entry.method === "oauth" && entry.timestamp
        ? [entry.timestamp]
        : [];
    }),
  );
  const recentGoogleSignIn =
    Date.now() / 1000 - lastOAuth < RECENT_SIGN_IN_MINUTES * 60;
  return { method, recentGoogleSignIn };
}
