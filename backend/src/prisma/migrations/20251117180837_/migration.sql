/*
  Warnings:

  - You are about to drop the column `is_enabled` on the `BrandSettings` table. All the data in the column will be lost.
  - You are about to drop the column `logo_url` on the `BrandSettings` table. All the data in the column will be lost.
  - You are about to drop the column `owner_user_id` on the `BrandSettings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `BrandSettings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `BrandSettings` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "BrandSettings" DROP CONSTRAINT "BrandSettings_owner_user_id_fkey";

-- DropIndex
DROP INDEX "BrandSettings_owner_user_id_key";

-- AlterTable
ALTER TABLE "BrandSettings" DROP COLUMN "is_enabled",
DROP COLUMN "logo_url",
DROP COLUMN "owner_user_id",
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "user_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BrandSettings_user_id_key" ON "BrandSettings"("user_id");

-- AddForeignKey
ALTER TABLE "BrandSettings" ADD CONSTRAINT "BrandSettings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
