-- AlterTable
ALTER TABLE "peer_transfer_sessions" ADD COLUMN     "receiver_socket_id" TEXT,
ADD COLUMN     "sender_socket_id" TEXT;
