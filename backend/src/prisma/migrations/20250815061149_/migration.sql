/*
  Warnings:

  - The values [USER] on the enum `TRANSFER_TYPE` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TRANSFER_TYPE_new" AS ENUM ('EMAIL', 'LINK');
ALTER TABLE "Transfers" ALTER COLUMN "transfer_type" TYPE "TRANSFER_TYPE_new" USING ("transfer_type"::text::"TRANSFER_TYPE_new");
ALTER TYPE "TRANSFER_TYPE" RENAME TO "TRANSFER_TYPE_old";
ALTER TYPE "TRANSFER_TYPE_new" RENAME TO "TRANSFER_TYPE";
DROP TYPE "TRANSFER_TYPE_old";
COMMIT;
