-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('MEMBER', 'ADMIN');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "createdById" UUID,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" VARCHAR(50),
ADD COLUMN     "photoPath" TEXT,
ALTER COLUMN "pairKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "role" "ParticipantRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "systemText" VARCHAR(200);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "readReceipts" BOOLEAN NOT NULL DEFAULT true;

