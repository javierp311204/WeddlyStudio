-- ═══════════════════════════════════════════════════════════════
-- WEDDLY — Migración 2FA
-- Ejecutar en psql del contenedor postgres:
--   docker exec -i weddly_postgres psql -U weddly -d weddly_db < tfa_migration.sql
-- ═══════════════════════════════════════════════════════════════

-- ── Paso 1: Verificar si los campos base ya existen ─────────────
-- Si `two_factor_enabled` y `two_factor_secret` ya existen en tu
-- schema.prisma y en la BD (que es tu caso), este bloque no hace nada.

DO $$
BEGIN
  -- two_factor_enabled (ya existe según schema.prisma)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- two_factor_secret (ya existe según schema.prisma)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'two_factor_secret'
  ) THEN
    ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
  END IF;
END $$;

-- ── Paso 2: Añadir campos de reset (NUEVOS — probablemente no existen) ──

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tfa_reset_token   TEXT,
  ADD COLUMN IF NOT EXISTS tfa_reset_expires TIMESTAMPTZ;

-- ── Paso 3: Índice para lookup eficiente del reset token ─────────

CREATE INDEX IF NOT EXISTS idx_users_tfa_reset_token
  ON users(tfa_reset_token)
  WHERE tfa_reset_token IS NOT NULL;

-- ── Verificación ──────────────────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_name = 'users'
  AND  column_name IN (
         'two_factor_enabled',
         'two_factor_secret',
         'tfa_reset_token',
         'tfa_reset_expires'
       )
ORDER BY column_name;