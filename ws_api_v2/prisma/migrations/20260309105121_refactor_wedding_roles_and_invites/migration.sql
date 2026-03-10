-- Paso 1: Crear la tabla primero (el ALTER ENUM la necesita)
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

-- Paso 2: Alterar el enum (ahora wedding_invites ya existe)
BEGIN;
CREATE TYPE "WeddingRole_new" AS ENUM ('owner', 'co_organizer', 'planner', 'guest');
ALTER TABLE "wedding_invites" ALTER COLUMN "role" TYPE "WeddingRole_new" USING ("role"::text::"WeddingRole_new");
ALTER TABLE "user_wedding_roles" ALTER COLUMN "role" TYPE "WeddingRole_new" USING ("role"::text::"WeddingRole_new");
ALTER TYPE "WeddingRole" RENAME TO "WeddingRole_old";
ALTER TYPE "WeddingRole_new" RENAME TO "WeddingRole";
DROP TYPE "WeddingRole_old";
COMMIT;

-- Paso 3: Índices y foreign keys
CREATE UNIQUE INDEX "wedding_invites_token_key" ON "wedding_invites"("token");
CREATE INDEX "wedding_invites_token_idx" ON "wedding_invites"("token");
CREATE INDEX "wedding_invites_wedding_id_idx" ON "wedding_invites"("wedding_id");
CREATE INDEX "wedding_invites_email_idx" ON "wedding_invites"("email");

ALTER TABLE "wedding_invites" ADD CONSTRAINT "wedding_invites_wedding_id_fkey"
    FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wedding_invites" ADD CONSTRAINT "wedding_invites_invited_by_fkey"
    FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;