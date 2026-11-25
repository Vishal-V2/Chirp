-- Supabase Storage bucket for profile avatars and banners.
--   * Public read (images are shown to everyone via their public URL).
--   * Max 5 MB, images only (enforced by Storage itself).
--   * Signed-in users may only write inside a folder named after their own
--     user id: profile-images/<auth.uid()>/...
-- The storage schema only exists on Supabase, not in Prisma's shadow database.

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'profile-images', 'profile-images', true, 5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS "profile images: upload to own folder" ON storage.objects;
  CREATE POLICY "profile images: upload to own folder" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'profile-images'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

  DROP POLICY IF EXISTS "profile images: update own files" ON storage.objects;
  CREATE POLICY "profile images: update own files" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
      bucket_id = 'profile-images'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

  DROP POLICY IF EXISTS "profile images: delete own files" ON storage.objects;
  CREATE POLICY "profile images: delete own files" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'profile-images'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );
END $$;
