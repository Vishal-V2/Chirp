-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'QUOTE';

-- AlterTable
ALTER TABLE "Tweet" ADD COLUMN     "quotedId" TEXT;

-- CreateIndex
CREATE INDEX "Tweet_quotedId_idx" ON "Tweet"("quotedId");

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_quotedId_fkey" FOREIGN KEY ("quotedId") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
