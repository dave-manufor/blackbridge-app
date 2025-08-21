/*
  Warnings:

  - You are about to drop the column `hashed_session_key` on the `Sessions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[session_key]` on the table `Sessions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Sessions_hashed_session_key_key";

-- AlterTable
ALTER TABLE "Sessions" DROP COLUMN "hashed_session_key",
ADD COLUMN     "session_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_session_key_key" ON "Sessions"("session_key");
