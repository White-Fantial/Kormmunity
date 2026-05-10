#!/usr/bin/env bash
# reset-db.sh
# Fully resets the database by:
# 1) dropping and recreating the public schema,
# 2) deleting all local migration files,
# 3) creating a fresh migration from current schema,
# 4) deploying that migration,
# 5) running the seed script.
#
# Usage:
#   bash scripts/reset-db.sh
#   npm run db:reset

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

set -a
source .env
set +a

echo "⚠️  This will DESTROY all data in the database and re-seed it."
echo "    DATABASE_URL: ${DATABASE_URL:-<not set>}"
echo ""

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is required."
  exit 1
fi

read -r -p "Continue? [y/N] " answer
case "$answer" in
  [yY][eE][sS]|[yY]) ;;
  *) echo "Aborted."; exit 1 ;;
esac

echo ""
echo "🗑️  Resetting public schema (drops all tables/types/sequences)..."
cat <<'SQL' | npm exec prisma -- db execute --schema prisma/schema.prisma --stdin
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
SQL

echo ""
echo "🧹 Deleting all migration files..."
rm -rf prisma/migrations
mkdir -p prisma/migrations

echo ""
echo "🧱 Creating a fresh migration from current schema..."
npm exec prisma -- migrate dev --name init --create-only

echo ""
echo "🚀 Deploying fresh migration..."
npm exec prisma -- migrate deploy

echo ""
echo "🌱 Seeding database..."
npm exec prisma -- db seed

echo ""
echo "✅ Database reset complete."
