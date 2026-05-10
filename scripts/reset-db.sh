#!/usr/bin/env bash
# reset-db.sh
# Fully resets the database: drops every table/object in the DB schema,
# initializes migration metadata again, re-applies every migration,
# and runs the seed script.
#
# Usage:
#   bash scripts/reset-db.sh
#   npm run db:reset

set -euo pipefail

echo "⚠️  This will DESTROY all data in the database and re-seed it."
echo "    DATABASE_URL: ${DATABASE_URL:-<not set>}"
echo ""

read -r -p "Continue? [y/N] " answer
case "$answer" in
  [yY][eE][sS]|[yY]) ;;
  *) echo "Aborted."; exit 1 ;;
esac

echo ""
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is required."
  exit 1
fi

echo "🗑️  Dropping all tables and schema objects..."
cat <<'SQL' | npx prisma db execute --schema prisma/schema.prisma --stdin
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SQL

echo ""
echo "🧱 Initializing and deploying migrations..."
npx prisma migrate deploy

echo ""
echo "🌱 Seeding database..."
npx prisma db seed

echo ""
echo "✅ Database reset complete."
