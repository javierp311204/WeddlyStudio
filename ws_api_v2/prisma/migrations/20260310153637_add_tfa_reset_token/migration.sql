-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "group" VARCHAR(50);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tfa_reset_expires" TIMESTAMP(3),
ADD COLUMN     "tfa_reset_token" TEXT;

-- AlterTable
ALTER TABLE "wedding_invites" ADD COLUMN     "declined_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "guests_group_idx" ON "guests"("group");
