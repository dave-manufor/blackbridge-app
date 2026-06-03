/*
  Warnings:

  - You are about to drop the `P2PSessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "P2PSessions" DROP CONSTRAINT "P2PSessions_receiver_id_fkey";

-- DropForeignKey
ALTER TABLE "P2PSessions" DROP CONSTRAINT "P2PSessions_sender_id_fkey";

-- DropTable
DROP TABLE "P2PSessions";

-- CreateTable
CREATE TABLE "peer_transfer_sessions" (
    "id" UUID NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "owner_key" TEXT NOT NULL,
    "recipient_key" TEXT NOT NULL,
    "status" "P2P_SESSION_STATUS" NOT NULL DEFAULT 'ACTIVE',
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peer_transfer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "peer_transfer_sessions_room_id_key" ON "peer_transfer_sessions"("room_id");

-- CreateIndex
CREATE INDEX "idx_p2p_sender_id" ON "peer_transfer_sessions"("sender_id");

-- CreateIndex
CREATE INDEX "idx_p2p_receiver_id" ON "peer_transfer_sessions"("receiver_id");

-- CreateIndex
CREATE INDEX "idx_p2p_status" ON "peer_transfer_sessions"("status");

-- AddForeignKey
ALTER TABLE "peer_transfer_sessions" ADD CONSTRAINT "peer_transfer_sessions_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_transfer_sessions" ADD CONSTRAINT "peer_transfer_sessions_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
