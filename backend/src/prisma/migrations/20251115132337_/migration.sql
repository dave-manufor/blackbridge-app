/*
  Warnings:

  - You are about to drop the column `transfer_id` on the `TransferRequests` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fulfilled_transfer_id]` on the table `TransferRequests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[requester_id,fulfilled_transfer_id]` on the table `TransferRequests` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "TransferRequests" DROP CONSTRAINT "TransferRequests_transfer_id_fkey";

-- DropIndex
DROP INDEX "TransferRequests_requester_id_transfer_id_key";

-- DropIndex
DROP INDEX "TransferRequests_transfer_id_key";

-- DropIndex
DROP INDEX "idx_transfer_request_transfer_id";

-- AlterTable
ALTER TABLE "TransferRequests" DROP COLUMN "transfer_id",
ADD COLUMN     "fulfilled_transfer_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequests_fulfilled_transfer_id_key" ON "TransferRequests"("fulfilled_transfer_id");

-- CreateIndex
CREATE INDEX "idx_transfer_request_transfer_id" ON "TransferRequests"("fulfilled_transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequests_requester_id_fulfilled_transfer_id_key" ON "TransferRequests"("requester_id", "fulfilled_transfer_id");

-- AddForeignKey
ALTER TABLE "TransferRequests" ADD CONSTRAINT "TransferRequests_fulfilled_transfer_id_fkey" FOREIGN KEY ("fulfilled_transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
