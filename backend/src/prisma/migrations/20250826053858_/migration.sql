/*
  Warnings:

  - A unique constraint covering the columns `[transfer_id,recipient_user_id]` on the table `EmailTransfers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EmailTransfers_transfer_id_recipient_user_id_key" ON "EmailTransfers"("transfer_id", "recipient_user_id");
