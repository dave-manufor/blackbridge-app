/*
  Warnings:

  - A unique constraint covering the columns `[owner_user_id]` on the table `BrandSettings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `owner_user_id` to the `BrandSettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BrandSettings" ADD COLUMN     "owner_user_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BrandSettings_owner_user_id_key" ON "BrandSettings"("owner_user_id");

-- AddForeignKey
ALTER TABLE "BrandSettings" ADD CONSTRAINT "BrandSettings_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
