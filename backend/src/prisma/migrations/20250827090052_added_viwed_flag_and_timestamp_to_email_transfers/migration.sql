-- AlterTable
ALTER TABLE "EmailTransfers" ADD COLUMN     "viewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "idx_user_transfers_viewed" ON "EmailTransfers"("viewed");

-- CreateIndex
CREATE INDEX "idx_user_transfers_viewed_recipient" ON "EmailTransfers"("viewed", "recipient_user_id");
