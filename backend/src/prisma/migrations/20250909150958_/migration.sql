-- AlterTable
ALTER TABLE "Invites" ADD COLUMN     "viewed_authorization" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewed_invite" BOOLEAN NOT NULL DEFAULT false;
