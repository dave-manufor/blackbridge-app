-- CreateEnum
CREATE TYPE "FILE_STATUS" AS ENUM ('PENDING', 'PROCESSING', 'UPLOADED', 'FAILED');

-- CreateEnum
CREATE TYPE "TRANSFER_TYPE" AS ENUM ('EMAIL', 'LINK');

-- CreateEnum
CREATE TYPE "TRANSFER_STATUS" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "profile_picture" UUID,
    "salt" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "salt" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "private_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hashed_refresh_token" TEXT NOT NULL,
    "session_key" TEXT,
    "user_agent" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_name" TEXT,
    "ip_address" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Files" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "status" "FILE_STATUS" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "content_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileBlocks" (
    "id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "encrypted_size" INTEGER,
    "path" TEXT NOT NULL,
    "upload_id" TEXT,
    "status" "FILE_STATUS" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileBlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfers" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "owner_file_key" TEXT,
    "transfer_type" "TRANSFER_TYPE" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" "TRANSFER_STATUS" NOT NULL DEFAULT 'PENDING',
    "expiration_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTransfers" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "file_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTransfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkTransfers" (
    "id" UUID NOT NULL,
    "transfer_id" UUID NOT NULL,
    "file_key" TEXT,
    "encrypted_fragment" TEXT,
    "is_password_protected" BOOLEAN NOT NULL DEFAULT false,
    "download_limit" INTEGER,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkTransfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_id_key" ON "Users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE INDEX "idx_user_email" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Keys_id_key" ON "Keys"("id");

-- CreateIndex
CREATE INDEX "idx_key_pair_user_id" ON "Keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Keys_user_id_primary_key" ON "Keys"("user_id", "primary");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_id_key" ON "Sessions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_hashed_refresh_token_key" ON "Sessions"("hashed_refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_session_key_key" ON "Sessions"("session_key");

-- CreateIndex
CREATE INDEX "idx_session_user_id" ON "Sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_file_user_id" ON "Files"("user_id");

-- CreateIndex
CREATE INDEX "idx_file_status" ON "Files"("status");

-- CreateIndex
CREATE INDEX "idx_files_transfer_status" ON "Files"("transfer_id", "status");

-- CreateIndex
CREATE INDEX "idx_files_user_transfer" ON "Files"("user_id", "transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "FileBlocks_path_key" ON "FileBlocks"("path");

-- CreateIndex
CREATE UNIQUE INDEX "FileBlocks_upload_id_key" ON "FileBlocks"("upload_id");

-- CreateIndex
CREATE INDEX "idx_file_blocks_file_id" ON "FileBlocks"("file_id");

-- CreateIndex
CREATE INDEX "idx_file_id_status" ON "FileBlocks"("file_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Transfers_id_key" ON "Transfers"("id");

-- CreateIndex
CREATE INDEX "idx_transfer_owner_user_id" ON "Transfers"("owner_user_id");

-- CreateIndex
CREATE INDEX "idx_transfer_type" ON "Transfers"("transfer_type");

-- CreateIndex
CREATE INDEX "idx_transfers_owner_status" ON "Transfers"("owner_user_id", "status");

-- CreateIndex
CREATE INDEX "idx_transfers_owner_type" ON "Transfers"("owner_user_id", "transfer_type");

-- CreateIndex
CREATE INDEX "idx_transfer_expiration_date" ON "Transfers"("expiration_date");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTransfers_id_key" ON "EmailTransfers"("id");

-- CreateIndex
CREATE INDEX "idx_user_transfers_recipient_user_id" ON "EmailTransfers"("recipient_user_id");

-- CreateIndex
CREATE INDEX "idx_user_transfer_id" ON "EmailTransfers"("transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTransfers_recipient_user_id_transfer_id_key" ON "EmailTransfers"("recipient_user_id", "transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkTransfers_id_key" ON "LinkTransfers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkTransfers_transfer_id_key" ON "LinkTransfers"("transfer_id");

-- CreateIndex
CREATE INDEX "idx_link_transfer_id" ON "LinkTransfers"("transfer_id");

-- CreateIndex
CREATE INDEX "idx_link_download_count_limit" ON "LinkTransfers"("download_count", "download_limit");

-- AddForeignKey
ALTER TABLE "Keys" ADD CONSTRAINT "Keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Files" ADD CONSTRAINT "Files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Files" ADD CONSTRAINT "Files_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileBlocks" ADD CONSTRAINT "FileBlocks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "Files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfers" ADD CONSTRAINT "Transfers_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTransfers" ADD CONSTRAINT "EmailTransfers_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTransfers" ADD CONSTRAINT "EmailTransfers_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkTransfers" ADD CONSTRAINT "LinkTransfers_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
