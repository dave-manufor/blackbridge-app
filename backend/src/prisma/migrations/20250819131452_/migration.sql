/*
  Warnings:

  - You are about to drop the column `isPasswordProtected` on the `LinkTransfers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LinkTransfers" DROP COLUMN "isPasswordProtected",
ADD COLUMN     "is_password_protected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;
