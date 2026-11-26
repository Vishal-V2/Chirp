-- CreateEnum
CREATE TYPE "DmPolicy" AS ENUM ('EVERYONE', 'FOLLOWING', 'NOBODY');

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "requestHiddenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dmPolicy" "DmPolicy" NOT NULL DEFAULT 'EVERYONE';


-- Every chat that exists today counts as accepted, so nothing turns into a request.
UPDATE "ConversationParticipant" SET "acceptedAt" = COALESCE("lastReadAt", now()) WHERE "acceptedAt" IS NULL;
