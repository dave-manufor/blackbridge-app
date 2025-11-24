/*
  Warnings:

  - Added the required column `files` to the `TransferRequests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TransferRequests" ADD COLUMN     "files" JSONB NOT NULL;
