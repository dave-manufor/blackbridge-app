/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `LinkTransfers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `LinkTransfers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LinkTransfers" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LinkTransfers_slug_key" ON "LinkTransfers"("slug");
