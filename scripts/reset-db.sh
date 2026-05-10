#!/usr/bin/env bash
# reset-db.sh
# Fully resets the database: drops every table in the DB schema,
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
echo "🗑️  Dropping all tables..."
cat <<'SQL' | npx prisma db execute --schema prisma/schema.prisma --stdin
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE', 'public', table_record.tablename);
  END LOOP;
END $$;
SQL

echo ""
echo "🧱 Initializing and deploying migrations..."
npx prisma migrate deploy

echo ""
echo "🌱 Seeding database..."
npx prisma db seed

echo ""
echo "✅ Database reset complete."
