/*
  Warnings:

  - The values [bride,groom] on the enum `WeddingRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WeddingRole_new" AS ENUM ('owner', 'co_organizer', 'planner', 'guest');
ALTER TABLE "wedding_invites" ALTER COLUMN "role" TYPE "WeddingRole_new" USING ("role"::text::"WeddingRole_new");
ALTER TABLE "user_wedding_roles" ALTER COLUMN "role" TYPE "WeddingRole_new" USING ("role"::text::"WeddingRole_new");
ALTER TYPE "WeddingRole" RENAME TO "WeddingRole_old";
ALTER TYPE "WeddingRole_new" RENAME TO "WeddingRole";
DROP TYPE "WeddingRole_old";
COMMIT;

-- CreateTable
CREATE TABLE "wedding_invites" (
    "id" UUID NOT NULL,
    "wedding_id" UUID NOT NULL,
    "invited_by" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "WeddingRole" NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wedding_invites_token_key" ON "wedding_invites"("token");

-- CreateIndex
CREATE INDEX "wedding_invites_token_idx" ON "wedding_invites"("token");

-- CreateIndex
CREATE INDEX "wedding_invites_wedding_id_idx" ON "wedding_invites"("wedding_id");

-- CreateIndex
CREATE INDEX "wedding_invites_email_idx" ON "wedding_invites"("email");

-- AddForeignKey
ALTER TABLE "wedding_invites" ADD CONSTRAINT "wedding_invites_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_invites" ADD CONSTRAINT "wedding_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
