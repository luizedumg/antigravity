#!/bin/sh
set -e

# ══════════════════════════════════════════════════════════════
# Entrypoint: Inicializa banco + inicia servidor
# ══════════════════════════════════════════════════════════════

# Se o banco não existe ainda no volume, criar
if [ ! -f /app/data/dev.db ]; then
  echo "🗄️  Criando banco de dados..."
  DATABASE_URL="file:/app/data/dev.db" npx prisma db push --schema=./prisma/schema.prisma
  echo "✅ Banco criado!"
else
  echo "✅ Banco de dados encontrado."
  # Aplicar migrações pendentes (se houver mudanças no schema)
  DATABASE_URL="file:/app/data/dev.db" npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>/dev/null || true
fi

echo "🚀 Iniciando servidor Next.js..."
DATABASE_URL="file:/app/data/dev.db" node server.js
