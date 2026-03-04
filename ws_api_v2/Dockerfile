# ─────────────────────────────────────────────
# WEDDLY API — Dockerfile Multi-Stage
# ─────────────────────────────────────────────

# ── Stage 1: Base ────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Instalar dependencias del sistema necesarias para bcrypt y otras nativas
RUN apk add --no-cache libc6-compat openssl

# Copiar manifests
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# ── Stage 2: Dependencies ────────────────────
FROM base AS deps
RUN npm ci --frozen-lockfile

# ── Stage 3: Builder ─────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar cliente Prisma
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# ── Stage 4: Runner (Producción) ─────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat openssl

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

# Copiar solo lo necesario
COPY --from=builder --chown=apiuser:nodejs /app/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=apiuser:nodejs /app/package.json ./

USER apiuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]

# ── Stage 5: Development ─────────────────────
FROM base AS development
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]