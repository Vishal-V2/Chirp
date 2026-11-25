-- When a Supabase Auth account is deleted (dashboard, admin API, or the user
-- deleting themselves), delete their Chirp profile too. Existing ON DELETE
-- CASCADE foreign keys then remove their tweets, likes, reposts and follows.
--
-- A trigger is used instead of a foreign key to auth.users so that seeded
-- sample users (which have no auth account) keep working.

CREATE OR REPLACE FUNCTION public.delete_profile_for_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as the owner, so it can delete regardless of caller
SET search_path = '' -- no search_path tricks; every name below is schema-qualified
AS $$
BEGIN
  DELETE FROM public."User" WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Not callable by API roles (Supabase exposes public functions over its Data API).
REVOKE ALL ON FUNCTION public.delete_profile_for_auth_user() FROM PUBLIC, anon, authenticated;

-- auth.users only exists on Supabase, not in Prisma's temporary shadow database.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
    CREATE TRIGGER on_auth_user_deleted
      AFTER DELETE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.delete_profile_for_auth_user();
  END IF;
END $$;
