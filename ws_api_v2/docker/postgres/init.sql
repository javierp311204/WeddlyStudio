-- ─────────────────────────────────────────────
-- WEDDLY DB — Init Script
-- Se ejecuta una sola vez al crear el contenedor
-- ─────────────────────────────────────────────

-- Extensión para UUIDs nativos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensión para búsqueda de texto completo
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Crear base de datos de test (si no existe)
SELECT 'CREATE DATABASE weddly_test'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'weddly_test'
)\gexec

-- Conectar a la DB principal y configurar
\c weddly_db;

-- Zona horaria por defecto
SET timezone = 'UTC';

-- Permisos al usuario de la app
GRANT ALL PRIVILEGES ON DATABASE weddly_db TO weddly;
GRANT ALL ON SCHEMA public TO weddly;

-- Log del init
DO $$
BEGIN
  RAISE NOTICE '✅ Weddly DB inicializada correctamente';
END $$;