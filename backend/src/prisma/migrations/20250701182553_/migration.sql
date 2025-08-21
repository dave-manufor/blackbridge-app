-- CreateEnum
CREATE TYPE "FILE_STATUS" AS ENUM ('PENDING', 'PROCESSING', 'UPLOADED', 'FAILED');

-- CreateEnum
CREATE TYPE "SHARE_TYPE" AS ENUM ('USER', 'LINK');

-- CreateEnum
CREATE TYPE "SHARE_STATUS" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
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
    "refresh_token" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_name" TEXT,
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
    "path" TEXT NOT NULL,
    "upload_id" TEXT NOT NULL,
    "status" "FILE_STATUS" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileBlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shares" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "share_type" "SHARE_TYPE" NOT NULL,
    "status" "SHARE_STATUS" NOT NULL DEFAULT 'ACTIVE',
    "expiration_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserShares" (
    "share_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "file_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserShares_pkey" PRIMARY KEY ("share_id","recipient_user_id")
);

-- CreateTable
CREATE TABLE "LinkShares" (
    "id" TEXT NOT NULL,
    "share_id" UUID NOT NULL,
    "file_key" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "download_limit" INTEGER,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkShares_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Keys_salt_key" ON "Keys"("salt");

-- CreateIndex
CREATE UNIQUE INDEX "Keys_public_key_key" ON "Keys"("public_key");

-- CreateIndex
CREATE UNIQUE INDEX "Keys_private_key_key" ON "Keys"("private_key");

-- CreateIndex
CREATE INDEX "idx_key_pair_user_id" ON "Keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Keys_user_id_primary_key" ON "Keys"("user_id", "primary");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_id_key" ON "Sessions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_refresh_token_key" ON "Sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "idx_session_user_id" ON "Sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_file_user_id" ON "Files"("user_id");

-- CreateIndex
CREATE INDEX "idx_file_status" ON "Files"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FileBlocks_path_key" ON "FileBlocks"("path");

-- CreateIndex
CREATE UNIQUE INDEX "FileBlocks_upload_id_key" ON "FileBlocks"("upload_id");

-- CreateIndex
CREATE INDEX "idx_file_blocks_file_id" ON "FileBlocks"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "Shares_id_key" ON "Shares"("id");

-- CreateIndex
CREATE INDEX "idx_share_file_id" ON "Shares"("file_id");

-- CreateIndex
CREATE INDEX "idx_share_owner_user_id" ON "Shares"("owner_user_id");

-- CreateIndex
CREATE INDEX "idx_share_type" ON "Shares"("share_type");

-- CreateIndex
CREATE UNIQUE INDEX "UserShares_share_id_key" ON "UserShares"("share_id");

-- CreateIndex
CREATE INDEX "idx_user_shares_recipient_user_id" ON "UserShares"("recipient_user_id");

-- CreateIndex
CREATE INDEX "idx_user_shares_share_id" ON "UserShares"("share_id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkShares_id_key" ON "LinkShares"("id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkShares_share_id_key" ON "LinkShares"("share_id");

-- CreateIndex
CREATE INDEX "idx_link_shares_share_id" ON "LinkShares"("share_id");

-- AddForeignKey
ALTER TABLE "Keys" ADD CONSTRAINT "Keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Files" ADD CONSTRAINT "Files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileBlocks" ADD CONSTRAINT "FileBlocks_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "Files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shares" ADD CONSTRAINT "Shares_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "Files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shares" ADD CONSTRAINT "Shares_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShares" ADD CONSTRAINT "UserShares_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "Shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShares" ADD CONSTRAINT "UserShares_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkShares" ADD CONSTRAINT "LinkShares_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "Shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;
