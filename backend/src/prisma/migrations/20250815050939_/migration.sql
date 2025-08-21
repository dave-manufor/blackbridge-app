/*
  Warnings:

  - You are about to drop the column `refresh_token` on the `Sessions` table. All the data in the column will be lost.
  - You are about to drop the `LinkShares` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Shares` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserShares` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[hashed_refresh_token]` on the table `Sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hashed_session_key]` on the table `Sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `encrypted_size` to the `FileBlocks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hashed_refresh_token` to the `Sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ip_address` to the `Sessions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TRANSFER_TYPE" AS ENUM ('USER', 'LINK');

-- CreateEnum
CREATE TYPE "TRANSFER_STATUS" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- DropForeignKey
ALTER TABLE "LinkShares" DROP CONSTRAINT "LinkShares_share_id_fkey";

-- DropForeignKey
ALTER TABLE "Shares" DROP CONSTRAINT "Shares_file_id_fkey";

-- DropForeignKey
ALTER TABLE "Shares" DROP CONSTRAINT "Shares_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserShares" DROP CONSTRAINT "UserShares_recipient_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserShares" DROP CONSTRAINT "UserShares_share_id_fkey";

-- DropIndex
DROP INDEX "Keys_private_key_key";

-- DropIndex
DROP INDEX "Keys_public_key_key";

-- DropIndex
DROP INDEX "Keys_salt_key";

-- DropIndex
DROP INDEX "Sessions_refresh_token_key";

-- AlterTable
ALTER TABLE "FileBlocks" ADD COLUMN     "encrypted_size" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Sessions" DROP COLUMN "refresh_token",
ADD COLUMN     "hashed_refresh_token" TEXT NOT NULL,
ADD COLUMN     "hashed_session_key" TEXT,
ADD COLUMN     "ip_address" TEXT NOT NULL;

-- DropTable
DROP TABLE "LinkShares";

-- DropTable
DROP TABLE "Shares";

-- DropTable
DROP TABLE "UserShares";

-- DropEnum
DROP TYPE "SHARE_STATUS";

-- DropEnum
DROP TYPE "SHARE_TYPE";

-- CreateTable
CREATE TABLE "Transfers" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "transfer_type" "TRANSFER_TYPE" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" "TRANSFER_STATUS" NOT NULL DEFAULT 'ACTIVE',
    "expiration_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTransfers" (
    "transfer_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "file_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTransfers_pkey" PRIMARY KEY ("transfer_id","recipient_user_id")
);

-- CreateTable
CREATE TABLE "LinkTransfers" (
    "id" TEXT NOT NULL,
    "transfer_id" UUID NOT NULL,
    "file_key" TEXT NOT NULL,
    "isPasswordProtected" BOOLEAN NOT NULL DEFAULT false,
    "download_limit" INTEGER,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkTransfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferFiles" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferFiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transfers_id_key" ON "Transfers"("id");

-- CreateIndex
CREATE INDEX "idx_transfer_owner_user_id" ON "Transfers"("owner_user_id");

-- CreateIndex
CREATE INDEX "idx_transfer_type" ON "Transfers"("transfer_type");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTransfers_transfer_id_key" ON "EmailTransfers"("transfer_id");

-- CreateIndex
CREATE INDEX "idx_user_transfers_recipient_user_id" ON "EmailTransfers"("recipient_user_id");

-- CreateIndex
CREATE INDEX "idx_user_transfer_id" ON "EmailTransfers"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkTransfers_id_key" ON "LinkTransfers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkTransfers_transfer_id_key" ON "LinkTransfers"("transfer_id");

-- CreateIndex
CREATE INDEX "idx_link_transfer_id" ON "LinkTransfers"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "TransferFiles_id_key" ON "TransferFiles"("id");

-- CreateIndex
CREATE INDEX "idx_transfer_files_transfer_id" ON "TransferFiles"("transfer_id");

-- CreateIndex
CREATE INDEX "idx_transfer_files_file_id" ON "TransferFiles"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_hashed_refresh_token_key" ON "Sessions"("hashed_refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_hashed_session_key_key" ON "Sessions"("hashed_session_key");

-- AddForeignKey
ALTER TABLE "Transfers" ADD CONSTRAINT "Transfers_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTransfers" ADD CONSTRAINT "EmailTransfers_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTransfers" ADD CONSTRAINT "EmailTransfers_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkTransfers" ADD CONSTRAINT "LinkTransfers_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferFiles" ADD CONSTRAINT "TransferFiles_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferFiles" ADD CONSTRAINT "TransferFiles_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "Files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
