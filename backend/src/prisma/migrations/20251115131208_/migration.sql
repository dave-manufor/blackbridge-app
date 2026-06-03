/*
  Warnings:

  - You are about to drop the column `approved` on the `TransferRequests` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `TransferRequests` table. All the data in the column will be lost.
  - You are about to drop the column `recipient_user_id` on the `TransferRequests` table. All the data in the column will be lost.
  - You are about to drop the column `requester_user_id` on the `TransferRequests` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[requester_id,transfer_id]` on the table `TransferRequests` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `recipient_id` to the `TransferRequests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requester_id` to the `TransferRequests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TRANSFER_REQUEST_STATUS" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "TransferRequests" DROP CONSTRAINT "TransferRequests_recipient_user_id_fkey";

-- DropForeignKey
ALTER TABLE "TransferRequests" DROP CONSTRAINT "TransferRequests_requester_user_id_fkey";

-- DropIndex
DROP INDEX "TransferRequests_requester_user_id_transfer_id_key";

-- AlterTable
ALTER TABLE "TransferRequests" DROP COLUMN "approved",
DROP COLUMN "message",
DROP COLUMN "recipient_user_id",
DROP COLUMN "requester_user_id",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "recipient_id" UUID NOT NULL,
ADD COLUMN     "requester_id" UUID NOT NULL,
ADD COLUMN     "status" "TRANSFER_REQUEST_STATUS" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "transfer_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_transfer_request_recipient_id" ON "TransferRequests"("recipient_id");

-- CreateIndex
CREATE INDEX "idx_transfer_request_requester_id" ON "TransferRequests"("requester_id");

-- CreateIndex
CREATE INDEX "idx_transfer_request_status" ON "TransferRequests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequests_requester_id_transfer_id_key" ON "TransferRequests"("requester_id", "transfer_id");

-- AddForeignKey
ALTER TABLE "TransferRequests" ADD CONSTRAINT "TransferRequests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequests" ADD CONSTRAINT "TransferRequests_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
