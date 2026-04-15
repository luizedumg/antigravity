#!/bin/sh
set -e

# ══════════════════════════════════════════════════════════════
# Entrypoint: Inicializa banco + inicia servidor
# ══════════════════════════════════════════════════════════════

export DATABASE_URL="file:/app/data/dev.db"

# Se o banco não existe ainda no volume, criar
if [ ! -f /app/data/dev.db ]; then
  echo "🗄️  Criando banco de dados..."
  npx prisma db push
  echo "✅ Banco criado!"
else
  echo "✅ Banco de dados encontrado."
  # Aplicar migrações pendentes (se houver mudanças no schema)
  npx prisma db push --accept-data-loss 2>/dev/null || true
fi

echo "🚀 Iniciando servidor Next.js..."
node server.js
