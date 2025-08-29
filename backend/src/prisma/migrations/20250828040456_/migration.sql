-- CreateTable
CREATE TABLE "LinkAccess" (
    "id" UUID NOT NULL,
    "link_transfer_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LinkAccess_id_key" ON "LinkAccess"("id");

-- CreateIndex
CREATE INDEX "idx_link_access_user_id" ON "LinkAccess"("user_id");

-- CreateIndex
CREATE INDEX "idx_link_access_link_transfer_id" ON "LinkAccess"("link_transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "LinkAccess_link_transfer_id_user_id_key" ON "LinkAccess"("link_transfer_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_link_slug" ON "LinkTransfers"("slug");

-- AddForeignKey
ALTER TABLE "LinkAccess" ADD CONSTRAINT "LinkAccess_link_transfer_id_fkey" FOREIGN KEY ("link_transfer_id") REFERENCES "LinkTransfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkAccess" ADD CONSTRAINT "LinkAccess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
