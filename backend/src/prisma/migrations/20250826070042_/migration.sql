-- AlterTable
ALTER TABLE "Transfers" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "idx_file_id_status" ON "FileBlocks"("file_id", "status");

-- CreateIndex
CREATE INDEX "idx_files_transfer_status" ON "Files"("transfer_id", "status");

-- CreateIndex
CREATE INDEX "idx_files_user_transfer" ON "Files"("user_id", "transfer_id");

-- CreateIndex
CREATE INDEX "idx_link_download_count_limit" ON "LinkTransfers"("download_count", "download_limit");

-- CreateIndex
CREATE INDEX "idx_transfers_owner_status" ON "Transfers"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "idx_transfers_owner_type" ON "Transfers"("owner_user_id", "transfer_type");

-- CreateIndex
CREATE INDEX "idx_transfer_expiration_date" ON "Transfers"("expiration_date");
