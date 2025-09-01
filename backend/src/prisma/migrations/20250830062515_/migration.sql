-- AlterTable
ALTER TABLE "EmailTransfers" ADD COLUMN     "downloaded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "downloaded_at" TIMESTAMP(3);
