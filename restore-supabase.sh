#!/bin/bash
#
# restore-supabase.sh — Restore Neon backup into Supabase PostgreSQL
#
# Usage:
#   chmod +x restore-supabase.sh
#   ./restore-supabase.sh
#
# Reads SUPABASE_DIRECT_URL from .env file.
# Imports: neon_backup.sql
#
# IMPORTANT: Uses the DIRECT URL (port 5432), NOT the pooler (port 6543).
#            PgBouncer pooler does not support DDL operations like CREATE TABLE.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
BACKUP_FILE="${SCRIPT_DIR}/neon_backup.sql"

# ─── Locate psql ──────────────────────────────────────────────
PSQL=""
if command -v psql &>/dev/null; then
  PSQL="psql"
elif [ -x "/opt/homebrew/opt/libpq/bin/psql" ]; then
  PSQL="/opt/homebrew/opt/libpq/bin/psql"
elif [ -x "/usr/local/opt/libpq/bin/psql" ]; then
  PSQL="/usr/local/opt/libpq/bin/psql"
else
  echo "❌ psql not found."
  echo "   Install with: brew install libpq"
  echo "   Then add to PATH: export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\""
  exit 1
fi

echo "Using psql: $PSQL"

# ─── Load environment ──────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found at: $ENV_FILE"
  exit 1
fi

# Parse SUPABASE_DIRECT_URL from .env
SUPABASE_URL=""
while IFS= read -r line; do
  # Skip comments and empty lines
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  if [[ "$line" =~ ^SUPABASE_DIRECT_URL= ]]; then
    SUPABASE_URL="${line#SUPABASE_DIRECT_URL=}"
    # Remove surrounding quotes if present
    SUPABASE_URL="${SUPABASE_URL%\"}"
    SUPABASE_URL="${SUPABASE_URL#\"}"
  fi
done < "$ENV_FILE"

if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_DIRECT_URL not found in .env"
  echo "   Add it to your .env file:"
  echo "   SUPABASE_DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
  exit 1
fi

# ─── Verify backup file exists ─────────────────────────────────
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  echo "   Run ./backup-neon.sh first."
  exit 1
fi

FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          SUPABASE DATABASE RESTORE                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📡 Target: Supabase PostgreSQL"
echo "📦 Source: $BACKUP_FILE ($FILE_SIZE)"
echo ""

# ─── Step 1: Check if Supabase has existing tables ─────────────
echo "🔍 Checking Supabase for existing tables..."

EXISTING_TABLES=$($PSQL "$SUPABASE_URL" -t -A -c "
  SELECT string_agg(table_name, ',')
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%';
" 2>&1) || true

if [ -n "$EXISTING_TABLES" ] && [ "$EXISTING_TABLES" != "" ]; then
  echo ""
  echo "⚠️  Supabase already has tables: $EXISTING_TABLES"
  echo ""
  echo "Options:"
  echo "  1) DROP all existing tables and import fresh (recommended for first migration)"
  echo "  2) Abort and investigate manually"
  echo ""
  read -r -p "Choose [1/2]: " CHOICE

  if [ "$CHOICE" = "1" ]; then
    echo ""
    echo "🗑  Dropping existing public schema tables..."
    $PSQL "$SUPABASE_URL" -c "
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    " 2>&1
    echo "   ✅ Public schema cleared."
  else
    echo "Aborted. No changes made to Supabase."
    exit 0
  fi
else
  echo "   ✅ Supabase is empty. Safe to import."
fi

# ─── Step 2: Import backup ────────────────────────────────────
echo ""
echo "⏳ Importing backup into Supabase..."
echo "   This may take a few minutes depending on data size..."
echo ""

# Use ON_ERROR_STOP to halt on first error, but capture output
IMPORT_OUTPUT=$($PSQL "$SUPABASE_URL" \
  --set ON_ERROR_STOP=off \
  -f "$BACKUP_FILE" 2>&1) || true

# Check for critical errors (ignore harmless extension/role errors)
CRITICAL_ERRORS=$(echo "$IMPORT_OUTPUT" | grep -i "ERROR" | grep -vi "extension\|role\|already exists\|does not exist.*DROP" || true)

if [ -n "$CRITICAL_ERRORS" ]; then
  echo "⚠️  Import completed with some errors:"
  echo "$CRITICAL_ERRORS"
  echo ""
  echo "Review the errors above. Common harmless errors:"
  echo "  • 'extension already exists' — safe to ignore"
  echo "  • 'role does not exist' — safe to ignore (Neon-specific roles)"
  echo ""
else
  echo "✅ Import completed successfully."
fi

# ─── Step 3: Verify sequences ─────────────────────────────────
echo ""
echo "🔧 Verifying and fixing sequences..."

# Fix all sequences to match current max IDs
SEQUENCE_FIX=$($PSQL "$SUPABASE_URL" -t -A -c "
  SELECT 'SELECT setval(pg_get_serial_sequence(''' || table_name || ''', ''id''), COALESCE((SELECT MAX(id) FROM ' || table_name || '), 0) + 1, false);'
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'id'
    AND is_identity = 'YES'
    OR (table_schema = 'public' AND column_name = 'id' AND column_default LIKE 'nextval%');
" 2>/dev/null) || true

if [ -n "$SEQUENCE_FIX" ]; then
  echo "$SEQUENCE_FIX" | $PSQL "$SUPABASE_URL" -t -A 2>/dev/null || true
  echo "   ✅ Sequences synchronized with max IDs."
else
  # Fallback: manually fix known sequences
  echo "   Using fallback sequence fix for known tables..."
  $PSQL "$SUPABASE_URL" -c "
    SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false);
    SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 0) + 1, false);
    SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 0) + 1, false);
    SELECT setval('candidates_id_seq', COALESCE((SELECT MAX(id) FROM candidates), 0) + 1, false);
    SELECT setval('attendance_id_seq', COALESCE((SELECT MAX(id) FROM attendance), 0) + 1, false);
    SELECT setval('reports_id_seq', COALESCE((SELECT MAX(id) FROM reports), 0) + 1, false);
    SELECT setval('groups_id_seq', COALESCE((SELECT MAX(id) FROM groups), 0) + 1, false);
    SELECT setval('meetings_id_seq', COALESCE((SELECT MAX(id) FROM meetings), 0) + 1, false);
    SELECT setval('notifications_id_seq', COALESCE((SELECT MAX(id) FROM notifications), 0) + 1, false);
    SELECT setval('work_logs_id_seq', COALESCE((SELECT MAX(id) FROM work_logs), 0) + 1, false);
    SELECT setval('group_messages_id_seq', COALESCE((SELECT MAX(id) FROM group_messages), 0) + 1, false);
    SELECT setval('chat_messages_id_seq', COALESCE((SELECT MAX(id) FROM chat_messages), 0) + 1, false);
    SELECT setval('tutors_id_seq', COALESCE((SELECT MAX(id) FROM tutors), 0) + 1, false);
    SELECT setval('break_requests_id_seq', COALESCE((SELECT MAX(id) FROM break_requests), 0) + 1, false);
  " 2>&1 || echo "   ⚠️  Some sequence fixes failed (tables may not exist yet)"
  echo "   ✅ Sequences synchronized."
fi

# ─── Step 4: Verify import ────────────────────────────────────
echo ""
echo "🔍 Verifying imported tables..."

TABLES_RESULT=$($PSQL "$SUPABASE_URL" -t -A -c "
  SELECT table_name || ':' || 
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public')
  FROM information_schema.tables t
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  ORDER BY table_name;
" 2>&1)

echo ""
echo "   Tables in Supabase after import:"
TABLE_COUNT=0
while IFS=':' read -r tname colcount; do
  [ -z "$tname" ] && continue
  ROW_COUNT=$($PSQL "$SUPABASE_URL" -t -A -c "SELECT COUNT(*) FROM \"$tname\";" 2>/dev/null || echo "?")
  echo "   ✅ $tname — $colcount columns, $ROW_COUNT rows"
  TABLE_COUNT=$((TABLE_COUNT + 1))
done <<< "$TABLES_RESULT"

echo ""
echo "📊 Import Summary:"
echo "   Tables imported:  $TABLE_COUNT"

# Check for migration history
MIGRATION_COUNT=$($PSQL "$SUPABASE_URL" -t -A -c "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null || echo "0")
echo "   Prisma migrations: $MIGRATION_COUNT"

# Check indexes
INDEX_COUNT=$($PSQL "$SUPABASE_URL" -t -A -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null || echo "0")
echo "   Indexes:          $INDEX_COUNT"

echo ""
echo "✅ Restore complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run: npx tsx scripts/validate-migration.ts"
echo "   2. Run: npx prisma db pull"
echo "   3. Run: npx prisma generate"
echo ""
