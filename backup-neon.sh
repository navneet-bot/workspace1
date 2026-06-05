#!/bin/bash
#
# backup-neon.sh — Full PostgreSQL backup from Neon database
#
# Usage:
#   chmod +x backup-neon.sh
#   ./backup-neon.sh
#
# Reads DATABASE_URL or DIRECT_URL from .env file.
# Outputs: neon_backup.sql
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
BACKUP_FILE="${SCRIPT_DIR}/neon_backup.sql"

# ─── Locate pg_dump ────────────────────────────────────────────
PG_DUMP=""
if command -v pg_dump &>/dev/null; then
  PG_DUMP="pg_dump"
elif [ -x "/opt/homebrew/opt/libpq/bin/pg_dump" ]; then
  PG_DUMP="/opt/homebrew/opt/libpq/bin/pg_dump"
elif [ -x "/usr/local/opt/libpq/bin/pg_dump" ]; then
  PG_DUMP="/usr/local/opt/libpq/bin/pg_dump"
else
  echo "❌ pg_dump not found."
  echo "   Install with: brew install libpq"
  echo "   Then add to PATH: export PATH=\"/opt/homebrew/opt/libpq/bin:\$PATH\""
  exit 1
fi

echo "Using pg_dump: $PG_DUMP"
$PG_DUMP --version

# ─── Load environment ──────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found at: $ENV_FILE"
  exit 1
fi

# Parse DATABASE_URL from .env (prefer DIRECT_URL for non-pooled connection)
NEON_URL=""
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  # Remove surrounding quotes if present
  value="${value%\"}"
  value="${value#\"}"
  if [ "$key" = "DIRECT_URL" ]; then
    NEON_URL="$value"
  elif [ "$key" = "DATABASE_URL" ] && [ -z "$NEON_URL" ]; then
    NEON_URL="$value"
  fi
done < "$ENV_FILE"

if [ -z "$NEON_URL" ]; then
  echo "❌ Neither DATABASE_URL nor DIRECT_URL found in .env"
  exit 1
fi

# Remove channel_binding parameter (not supported by all pg_dump versions)
CLEAN_URL=$(echo "$NEON_URL" | sed 's/&channel_binding=require//g; s/?channel_binding=require&/?/g; s/?channel_binding=require$//')

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          NEON DATABASE BACKUP                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📡 Source: Neon PostgreSQL"
echo "📦 Output: $BACKUP_FILE"
echo ""

# ─── Run pg_dump ───────────────────────────────────────────────
echo "⏳ Starting full database dump..."
echo ""

$PG_DUMP "$CLEAN_URL" \
  --no-owner \
  --no-privileges \
  --no-comments \
  --format=plain \
  --file="$BACKUP_FILE" \
  2>&1

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ pg_dump failed!"
  echo ""
  echo "Common causes:"
  echo "  • Neon data transfer quota exceeded (free plan limit)"
  echo "  • Invalid connection string"
  echo "  • Network connectivity issue"
  echo ""
  echo "If quota exceeded, options:"
  echo "  1. Upgrade Neon plan temporarily"
  echo "  2. Wait for monthly quota reset"
  echo "  3. Export via Neon Dashboard SQL Editor"
  exit 1
fi

# ─── Verify backup ────────────────────────────────────────────
echo ""
echo "✅ Backup completed: $BACKUP_FILE"
echo ""

FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "📊 Backup Statistics:"
echo "   File size:       $FILE_SIZE"

TABLE_COUNT=$(grep -c "^CREATE TABLE" "$BACKUP_FILE" 2>/dev/null || echo "0")
echo "   Tables found:    $TABLE_COUNT"

COPY_COUNT=$(grep -c "^COPY " "$BACKUP_FILE" 2>/dev/null || echo "0")
echo "   Data sections:   $COPY_COUNT"

INDEX_COUNT=$(grep -c "^CREATE.*INDEX" "$BACKUP_FILE" 2>/dev/null || echo "0")
echo "   Indexes found:   $INDEX_COUNT"

SEQUENCE_COUNT=$(grep -c "^CREATE SEQUENCE\|^SELECT pg_catalog.setval" "$BACKUP_FILE" 2>/dev/null || echo "0")
echo "   Sequences:       $SEQUENCE_COUNT"

# Verify key tables exist in the dump
echo ""
echo "🔍 Verifying key tables in backup:"
EXPECTED_TABLES=("users" "tutors" "candidates" "attendance" "tasks" "projects" "work_logs" "meetings" "notifications" "group_messages" "chat_messages" "config" "reports" "groups" "break_requests")
MISSING=0

for table in "${EXPECTED_TABLES[@]}"; do
  if grep -q "CREATE TABLE.*\<${table}\>" "$BACKUP_FILE" 2>/dev/null || grep -q "CREATE TABLE.*\"${table}\"" "$BACKUP_FILE" 2>/dev/null; then
    echo "   ✅ $table"
  else
    echo "   ❌ $table — MISSING!"
    MISSING=$((MISSING + 1))
  fi
done

# Check for _prisma_migrations
if grep -q "_prisma_migrations" "$BACKUP_FILE" 2>/dev/null; then
  echo "   ✅ _prisma_migrations (migration history)"
else
  echo "   ⚠️  _prisma_migrations — not found (will be recreated by Prisma)"
fi

echo ""
if [ "$MISSING" -gt 0 ]; then
  echo "⚠️  $MISSING table(s) missing from backup. Review before proceeding."
else
  echo "✅ All $TABLE_COUNT tables present. Backup is ready for import."
fi

echo ""
echo "📋 Next step: ./restore-supabase.sh"
echo ""
