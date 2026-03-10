-- Migration: add_group_to_guests
-- Añade el campo "group" al modelo Guest para categorizar invitados
-- (familia, amigos, trabajo, pareja, otro)
-- Generado para: Weddly Studio
-- Fecha: 2026-03-10

ALTER TABLE "guests"
  ADD COLUMN "group" VARCHAR(50);

-- Índice para filtrado y colorización por grupo en el plano
CREATE INDEX "guests_group_idx" ON "guests"("group");

COMMENT ON COLUMN "guests"."group" IS 'Categoría del invitado: familia, amigos, trabajo, pareja, otro';