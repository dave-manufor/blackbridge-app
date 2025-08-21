/*
  Warnings:

  - You are about to drop the `TransferFiles` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `transfer_id` to the `Files` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TransferFiles" DROP CONSTRAINT "TransferFiles_file_id_fkey";

-- DropForeignKey
ALTER TABLE "TransferFiles" DROP CONSTRAINT "TransferFiles_transfer_id_fkey";

-- AlterTable
ALTER TABLE "Files" ADD COLUMN     "transfer_id" UUID NOT NULL;

-- DropTable
DROP TABLE "TransferFiles";

-- AddForeignKey
ALTER TABLE "Files" ADD CONSTRAINT "Files_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
