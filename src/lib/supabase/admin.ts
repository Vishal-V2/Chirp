import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase with full (service) access. Server-only, and used only by the
 * account clean-up job: it can delete any user's login and files.
 * Needs SUPABASE_SECRET_KEY (Supabase → Project Settings → API Keys).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
