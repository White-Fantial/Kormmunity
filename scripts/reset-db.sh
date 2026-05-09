#!/usr/bin/env bash
# reset-db.sh
# Fully resets the database: drops all data, resets migration history,
# re-applies every migration, and runs the seed script.
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
echo "🗑️  Resetting database and migration history..."
npx prisma migrate reset --force

echo ""
echo "✅ Database reset complete."
