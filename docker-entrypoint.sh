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
  # Sincroniza o schema (cria índices/colunas novas). SEM --accept-data-loss:
  # mudanças aditivas são aplicadas; se algo fosse DESTRUIR dados, o push falha
  # ruidosamente (set -e aborta o boot) em vez de apagar contratos em silêncio.
  echo "🔄 Sincronizando schema (não-destrutivo)..."
  $PRISMA db push --skip-generate
fi

echo "🚀 Iniciando servidor Next.js..."
node server.js
