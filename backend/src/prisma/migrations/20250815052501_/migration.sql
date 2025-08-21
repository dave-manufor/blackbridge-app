-- AlterTable
ALTER TABLE "EmailTransfers" ALTER COLUMN "file_key" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LinkTransfers" ALTER COLUMN "file_key" DROP NOT NULL;
