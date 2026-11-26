-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaPaths" TEXT[] DEFAULT ARRAY[]::TEXT[];


-- Private storage for images sent in messages.
--   * NOT public: files are opened with short-lived signed links.
--   * Paths are <conversationId>/<senderId>/<file>.
--   * Upload: only into chats you're in, and only into your own folder.
--   * Read: only the chat's participants.  Delete: only your own files.
-- The storage schema only exists on Supabase, not in Prisma's shadow database.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'message-media', 'message-media', false, 5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  DROP POLICY IF EXISTS "message media: participants upload own files" ON storage.objects;
  CREATE POLICY "message media: participants upload own files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'message-media'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      AND (SELECT private.is_conversation_participant((storage.foldername(name))[1]))
    );

  DROP POLICY IF EXISTS "message media: participants read" ON storage.objects;
  CREATE POLICY "message media: participants read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'message-media'
      AND (SELECT private.is_conversation_participant((storage.foldername(name))[1]))
    );

  DROP POLICY IF EXISTS "message media: delete own files" ON storage.objects;
  CREATE POLICY "message media: delete own files" ON storage.objects
    FOR DELETE TO authenticated
    USING (
      bucket_id = 'message-media'
      AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    );
END $$;
