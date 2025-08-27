-- CreateEnum
CREATE TYPE "LINK_ACCESS_CONTROL" AS ENUM ('PUBLIC', 'REQUIRE_AUTH', 'PRIVATE');

-- AlterTable
ALTER TABLE "LinkTransfers" ADD COLUMN     "access_control" "LINK_ACCESS_CONTROL" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE INDEX "idx_link_access_control" ON "LinkTransfers"("access_control");

-- CreateIndex
CREATE INDEX "idx_link_transfer_access" ON "LinkTransfers"("transfer_id", "access_control");
