# ─────────────────────────────────────────────
# WEDDLY — Makefile
# Uso: make <comando>
# ─────────────────────────────────────────────

.PHONY: help up down dev build logs ps clean migrate seed studio reset

# Colores
CYAN  = \033[0;36m
RESET = \033[0m

help: ## Muestra esta ayuda
	@echo "$(CYAN)Weddly Studio — Comandos disponibles:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'

# ── Docker ────────────────────────────────────

up: ## Levantar todos los servicios (dev)
	docker compose --profile dev up -d
	@echo "$(CYAN)✅ Servicios levantados$(RESET)"
	@echo "  API:     http://localhost:3000"
	@echo "  PgAdmin: http://localhost:5050"

down: ## Parar todos los servicios
	docker compose --profile dev down

dev: ## Levantar solo API + DB + Redis (sin PgAdmin)
	docker compose up -d

build: ## Rebuilder imágenes
	docker compose build --no-cache

logs: ## Ver logs en tiempo real
	docker compose logs -f api

logs-db: ## Ver logs de PostgreSQL
	docker compose logs -f postgres

ps: ## Estado de los contenedores
	docker compose ps

clean: ## Eliminar contenedores, volúmenes e imágenes
	docker compose down -v --rmi local
	@echo "$(CYAN)✅ Todo limpio$(RESET)"

# ── Base de datos ──────────────────────────────

migrate: ## Crear y aplicar nueva migración
	docker compose exec api npx prisma migrate dev

migrate-prod: ## Aplicar migraciones en producción
	docker compose exec api npx prisma migrate deploy

seed: ## Ejecutar seed (planes + admin)
	docker compose exec api npm run db:seed

studio: ## Abrir Prisma Studio en el browser
	docker compose exec api npx prisma studio

reset: ## Reset completo de la DB (peligroso)
	@echo "⚠️  Esto borrará TODOS los datos. ¿Seguro? (Ctrl+C para cancelar)"
	@sleep 3
	docker compose exec api npx prisma migrate reset --force

generate: ## Regenerar cliente Prisma
	docker compose exec api npx prisma generate

# ── Producción ─────────────────────────────────

prod-up: ## Levantar en modo producción
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down: ## Parar producción
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

# ── Desarrollo local (sin Docker) ─────────────

install: ## Instalar dependencias
	npm install
	npx prisma generate

local-dev: ## Correr API localmente (requiere DB externa)
	npm run dev