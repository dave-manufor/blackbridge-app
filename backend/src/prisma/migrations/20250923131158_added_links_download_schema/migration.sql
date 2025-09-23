/*
  Warnings:

  - You are about to drop the column `download_count` on the `LinkTransfers` table. All the data in the column will be lost.
  - You are about to drop the column `download_limit` on the `LinkTransfers` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_link_download_count_limit";

-- AlterTable
ALTER TABLE "LinkTransfers" DROP COLUMN "download_count",
DROP COLUMN "download_limit";

-- CreateTable
CREATE TABLE "LinkTransferDownloads" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "link_transfer_id" UUID NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkTransferDownloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkTransferDownloads_id_key" ON "LinkTransferDownloads"("id");

-- CreateIndex
CREATE INDEX "idx_download_file_id" ON "LinkTransferDownloads"("file_id");

-- CreateIndex
CREATE INDEX "idx_download_user_id" ON "LinkTransferDownloads"("user_id");

-- CreateIndex
CREATE INDEX "idx_download_link_transfer_id" ON "LinkTransferDownloads"("link_transfer_id");

-- AddForeignKey
ALTER TABLE "LinkTransferDownloads" ADD CONSTRAINT "LinkTransferDownloads_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "Files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkTransferDownloads" ADD CONSTRAINT "LinkTransferDownloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkTransferDownloads" ADD CONSTRAINT "LinkTransferDownloads_link_transfer_id_fkey" FOREIGN KEY ("link_transfer_id") REFERENCES "LinkTransfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
