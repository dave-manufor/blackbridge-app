/*
  Warnings:

  - Added the required column `title` to the `TransferRequests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TransferRequests" ADD COLUMN     "title" TEXT NOT NULL;
