/*
  Warnings:

  - The primary key for the `EmailTransfers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `LinkTransfers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `EmailTransfers` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `EmailTransfers` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Changed the type of `id` on the `LinkTransfers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "EmailTransfers" DROP CONSTRAINT "EmailTransfers_pkey",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "EmailTransfers_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "LinkTransfers" DROP CONSTRAINT "LinkTransfers_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "LinkTransfers_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTransfers_id_key" ON "EmailTransfers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkTransfers_id_key" ON "LinkTransfers"("id");
