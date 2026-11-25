-- Realtime Authorization: who may join Chirp's private Realtime channels.
-- Supabase checks these rules (on realtime.messages) when a client joins a
-- channel created with `private: true`, and when it sends a broadcast.
--
--   typing:<conversationId>  only that conversation's two participants
--   inbox:<userId>           only that user (carries their new-message events)
--
-- The realtime schema only exists on Supabase, not in Prisma's shadow database.

DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NULL THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "chirp: participants receive typing" ON realtime.messages;
  CREATE POLICY "chirp: participants receive typing" ON realtime.messages
    FOR SELECT TO authenticated
    USING (
      realtime.messages.extension = 'broadcast'
      AND split_part((SELECT realtime.topic()), ':', 1) = 'typing'
      AND (SELECT private.is_conversation_participant(split_part((SELECT realtime.topic()), ':', 2)))
    );

  DROP POLICY IF EXISTS "chirp: participants send typing" ON realtime.messages;
  CREATE POLICY "chirp: participants send typing" ON realtime.messages
    FOR INSERT TO authenticated
    WITH CHECK (
      realtime.messages.extension = 'broadcast'
      AND split_part((SELECT realtime.topic()), ':', 1) = 'typing'
      AND (SELECT private.is_conversation_participant(split_part((SELECT realtime.topic()), ':', 2)))
    );

  -- Your inbox channel. New messages on it still pass the "participants can
  -- read messages" rule on public."Message" before they're delivered.
  DROP POLICY IF EXISTS "chirp: join your own inbox" ON realtime.messages;
  CREATE POLICY "chirp: join your own inbox" ON realtime.messages
    FOR SELECT TO authenticated
    USING ((SELECT realtime.topic()) = 'inbox:' || (SELECT auth.uid())::text);
END $$;
