-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pinnedTweetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_pinnedTweetId_key" ON "User"("pinnedTweetId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pinnedTweetId_fkey" FOREIGN KEY ("pinnedTweetId") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

