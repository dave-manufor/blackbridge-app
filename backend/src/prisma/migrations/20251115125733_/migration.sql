-- CreateTable
CREATE TABLE "TransferRequests" (
    "id" UUID NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "message" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferRequests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequests_id_key" ON "TransferRequests"("id");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequests_transfer_id_key" ON "TransferRequests"("transfer_id");

-- CreateIndex
CREATE INDEX "idx_transfer_request_transfer_id" ON "TransferRequests"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "TransferRequests_requester_user_id_transfer_id_key" ON "TransferRequests"("requester_user_id", "transfer_id");

-- AddForeignKey
ALTER TABLE "TransferRequests" ADD CONSTRAINT "TransferRequests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequests" ADD CONSTRAINT "TransferRequests_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferRequests" ADD CONSTRAINT "TransferRequests_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
