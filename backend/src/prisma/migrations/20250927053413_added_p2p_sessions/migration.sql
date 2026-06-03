-- CreateEnum
CREATE TYPE "P2P_SESSION_STATUS" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "P2PSessions" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "status" "P2P_SESSION_STATUS" NOT NULL DEFAULT 'ACTIVE',
    "files_meta" JSONB[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "P2PSessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "P2PSessions_id_key" ON "P2PSessions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "P2PSessions_room_id_key" ON "P2PSessions"("room_id");

-- CreateIndex
CREATE INDEX "idx_p2p_session_sender_id" ON "P2PSessions"("sender_id");

-- CreateIndex
CREATE INDEX "idx_p2p_session_receiver_id" ON "P2PSessions"("receiver_id");

-- AddForeignKey
ALTER TABLE "P2PSessions" ADD CONSTRAINT "P2PSessions_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "P2PSessions" ADD CONSTRAINT "P2PSessions_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
