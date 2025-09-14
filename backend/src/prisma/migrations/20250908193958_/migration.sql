-- CreateEnum
CREATE TYPE "INVITE_STATUS" AS ENUM ('PENDING', 'ACCEPTED', 'APPROVED');

-- CreateTable
CREATE TABLE "Invites" (
    "id" UUID NOT NULL,
    "inviter_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "INVITE_STATUS" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invites_id_key" ON "Invites"("id");

-- CreateIndex
CREATE INDEX "idx_invite_transfer_id" ON "Invites"("transfer_id");

-- CreateIndex
CREATE INDEX "idx_invite_email" ON "Invites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invites_email_transfer_id_key" ON "Invites"("email", "transfer_id");

-- AddForeignKey
ALTER TABLE "Invites" ADD CONSTRAINT "Invites_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invites" ADD CONSTRAINT "Invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
