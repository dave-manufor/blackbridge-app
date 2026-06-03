/*
  Warnings:

  - You are about to drop the column `fulfilled_transfer_id` on the `TransferRequests` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[transfer_id]` on the table `TransferRequests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[requester_id,transfer_id]` on the table `TransferRequests` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "TransferRequests" DROP CONSTRAINT "TransferRequests_fulfilled_transfer_id_fkey";

-- DropIndex
DROP INDEX "TransferRequests_fulfilled_transfer_id_key";

-- DropIndex
DROP INDEX "TransferRequests_requester_id_fulfilled_transfer_id_key";

-- DropIndex
DROP INDEX "idx_transfer_request_transfer_id";

-- AlterTable
ALTER TABLE "TransferRequests" DROP COLUMN "fulfilled_transfer_id",
ADD COLUMN     "transfer_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequests_transfer_id_key" ON "TransferRequests"("transfer_id");

-- CreateIndex
CREATE INDEX "idx_transfer_request_transfer_id" ON "TransferRequests"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequests_requester_id_transfer_id_key" ON "TransferRequests"("requester_id", "transfer_id");

-- AddForeignKey
ALTER TABLE "TransferRequests" ADD CONSTRAINT "TransferRequests_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
