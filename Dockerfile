# ══════════════════════════════════════════════════════════════
# Dockerfile — Antigravity (Next.js + Prisma + SQLite)
# Deploy via Coolify na VPS
# ══════════════════════════════════════════════════════════════

# ─── Stage 1: Instalar dependências ───
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: Build da aplicação ───
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy DATABASE_URL para build (Prisma 5 exige)
ENV DATABASE_URL="file:./prisma/dev.db"

# Gerar Prisma Client
RUN npx prisma generate

# Build do Next.js (standalone)
RUN npm run build

# ─── Stage 3: Produção ───
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiar arquivos necessários do build standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copiar Prisma schema + config (para poder rodar db push)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv

# Criar diretório de templates (será montado como volume)
RUN mkdir -p /app/templates

# Criar diretório do banco de dados (será montado como volume)
RUN mkdir -p /app/data

# Script de inicialização
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
