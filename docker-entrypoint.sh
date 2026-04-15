#!/bin/sh
set -e

# ══════════════════════════════════════════════════════════════
# Entrypoint: Inicializa banco + inicia servidor
# ══════════════════════════════════════════════════════════════

export DATABASE_URL="file:/app/data/dev.db"

# Usar o Prisma LOCAL (5.22.0) e não o npx (que baixa 7.x)
PRISMA="node ./node_modules/prisma/build/index.js"

# Se o banco não existe ainda no volume, criar
if [ ! -f /app/data/dev.db ]; then
  echo "🗄️  Criando banco de dados..."
  $PRISMA db push --skip-generate
  echo "✅ Banco criado!"
else
  echo "✅ Banco de dados encontrado."
  # Aplicar migrações pendentes (se houver mudanças no schema)
  $PRISMA db push --skip-generate --accept-data-loss 2>/dev/null || true
fi

echo "🚀 Iniciando servidor Next.js..."
node server.js
