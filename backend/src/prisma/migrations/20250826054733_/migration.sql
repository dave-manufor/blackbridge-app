/*
  Warnings:

  - A unique constraint covering the columns `[recipient_user_id,transfer_id]` on the table `EmailTransfers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EmailTransfers_recipient_user_id_transfer_id_key" ON "EmailTransfers"("recipient_user_id", "transfer_id");
