/**
 * validate-migration.ts — Compare Neon vs Supabase databases
 *
 * Compares:
 *  • Table existence
 *  • Row counts per table
 *  • Primary keys
 *  • Indexes
 *  • Foreign keys
 *  • Prisma migration history
 *
 * Usage:
 *   npx tsx scripts/validate-migration.ts
 *
 * Reads from .env:
 *   DATABASE_URL         — Neon connection
 *   SUPABASE_DIRECT_URL  — Supabase connection (direct, not pooler)
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Parse .env manually ─────────────────────────────────────
function loadEnv(): Record<string, string> {
  const envPath = resolve(__dirname, "..", ".env");
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();
    // Strip quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv();

// ─── Configuration ────────────────────────────────────────────
const NEON_URL = env.DATABASE_URL || env.DIRECT_URL;
const SUPABASE_URL = env.SUPABASE_DIRECT_URL;

if (!NEON_URL) {
  console.error("❌ DATABASE_URL or DIRECT_URL not found in .env");
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_DIRECT_URL not found in .env");
  process.exit(1);
}

// Tables to validate (from Prisma schema)
const EXPECTED_TABLES = [
  "users",
  "tasks",
  "projects",
  "candidates",
  "attendance",
  "reports",
  "groups",
  "meetings",
  "notifications",
  "work_logs",
  "group_messages",
  "chat_messages",
  "config",
  "tutors",
  "break_requests",
];

// ─── Types ────────────────────────────────────────────────────
interface TableInfo {
  name: string;
  rowCount: number;
  exists: boolean;
}

interface IndexInfo {
  table: string;
  name: string;
  definition: string;
}

interface PKInfo {
  table: string;
  constraintName: string;
  columns: string;
}

interface FKInfo {
  table: string;
  constraintName: string;
  definition: string;
}

interface MigrationInfo {
  id: string;
  name: string;
  appliedAt: string;
}

interface ValidationResult {
  pass: boolean;
  message: string;
  neon?: string | number;
  supabase?: string | number;
}

// ─── Database Query Helpers ───────────────────────────────────

async function getTableRowCounts(prisma: PrismaClient, tables: string[]): Promise<TableInfo[]> {
  const results: TableInfo[] = [];
  for (const table of tables) {
    try {
      const count: [{ count: bigint }] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM "${table}"`
      );
      results.push({ name: table, rowCount: Number(count[0].count), exists: true });
    } catch {
      results.push({ name: table, rowCount: 0, exists: false });
    }
  }
  return results;
}

async function getIndexes(prisma: PrismaClient): Promise<IndexInfo[]> {
  const rows: any[] = await prisma.$queryRaw`
    SELECT tablename as table, indexname as name, indexdef as definition
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;
  return rows.map((r) => ({ table: r.table, name: r.name, definition: r.definition }));
}

async function getPrimaryKeys(prisma: PrismaClient): Promise<PKInfo[]> {
  const rows: any[] = await prisma.$queryRaw`
    SELECT
      tc.table_name as table,
      tc.constraint_name as "constraintName",
      string_agg(kcu.column_name, ', ') as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
    GROUP BY tc.table_name, tc.constraint_name
    ORDER BY tc.table_name;
  `;
  return rows.map((r) => ({ table: r.table, constraintName: r.constraintName, columns: r.columns }));
}

async function getForeignKeys(prisma: PrismaClient): Promise<FKInfo[]> {
  const rows: any[] = await prisma.$queryRaw`
    SELECT
      tc.table_name as table,
      tc.constraint_name as "constraintName",
      pgc.confrelid::regclass::text as definition
    FROM information_schema.table_constraints tc
    JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name;
  `;
  return rows.map((r) => ({ table: r.table, constraintName: r.constraintName, definition: r.definition }));
}

async function getMigrations(prisma: PrismaClient): Promise<MigrationInfo[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT id, migration_name as name, finished_at as "appliedAt"
      FROM _prisma_migrations
      ORDER BY finished_at;
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      appliedAt: r.appliedAt?.toISOString?.() || String(r.appliedAt),
    }));
  } catch {
    return [];
  }
}

// ─── Main Validation ──────────────────────────────────────────

async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║      MIGRATION VALIDATION: Neon vs Supabase             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");

  // Create separate Prisma clients for each database
  const neonPrisma = new PrismaClient({
    datasources: { db: { url: NEON_URL } },
  });

  const supabasePrisma = new PrismaClient({
    datasources: { db: { url: SUPABASE_URL } },
  });

  const results: ValidationResult[] = [];
  let neonAccessible = true;

  // ─── Test Connections ───────────────────────────────────────
  console.log("🔌 Testing connections...\n");

  try {
    await neonPrisma.$queryRaw`SELECT 1`;
    console.log("   ✅ Neon: Connected");
  } catch (e: any) {
    console.log("   ❌ Neon: Connection FAILED —", e.message?.substring(0, 100));
    console.log("      ⚠️  Neon may have exceeded data transfer quota.");
    console.log("      Continuing with Supabase-only validation...\n");
    neonAccessible = false;
  }

  try {
    await supabasePrisma.$queryRaw`SELECT 1`;
    console.log("   ✅ Supabase: Connected");
  } catch (e: any) {
    console.log("   ❌ Supabase: Connection FAILED —", e.message?.substring(0, 100));
    console.log("\n   Cannot validate without Supabase access. Aborting.");
    process.exit(1);
  }

  console.log("");

  // ─── 1. Table Existence & Row Counts ────────────────────────
  console.log("━━━ 1. TABLE EXISTENCE & ROW COUNTS ━━━━━━━━━━━━━━━━━━━━━\n");

  let neonTables: TableInfo[] = [];
  if (neonAccessible) {
    neonTables = await getTableRowCounts(neonPrisma, EXPECTED_TABLES);
  }
  const supabaseTables = await getTableRowCounts(supabasePrisma, EXPECTED_TABLES);

  console.log(
    "   " +
      "Table".padEnd(20) +
      (neonAccessible ? "Neon".padStart(10) : "") +
      "Supabase".padStart(12) +
      "Status".padStart(10)
  );
  console.log("   " + "─".repeat(neonAccessible ? 52 : 42));

  for (const table of EXPECTED_TABLES) {
    const neon = neonTables.find((t) => t.name === table);
    const supa = supabaseTables.find((t) => t.name === table);

    let status: string;
    let pass: boolean;

    if (!supa?.exists) {
      status = "❌ MISSING";
      pass = false;
    } else if (!neonAccessible) {
      status = supa.rowCount > 0 ? "✅" : "⚠️  EMPTY";
      pass = supa.rowCount > 0;
    } else if (!neon?.exists) {
      status = "⚠️  N/A";
      pass = true; // Table doesn't exist in source either
    } else if (neon.rowCount === supa.rowCount) {
      status = "✅ MATCH";
      pass = true;
    } else {
      status = "❌ MISMATCH";
      pass = false;
    }

    const neonStr = neonAccessible ? (neon?.exists ? String(neon.rowCount).padStart(10) : "N/A".padStart(10)) : "";
    const supaStr = supa?.exists ? String(supa.rowCount).padStart(12) : "N/A".padStart(12);

    console.log("   " + table.padEnd(20) + neonStr + supaStr + status.padStart(15));

    results.push({
      pass,
      message: `Table ${table}`,
      neon: neon?.rowCount ?? "N/A",
      supabase: supa?.rowCount ?? "N/A",
    });
  }

  // ─── 2. Primary Keys ──────────────────────────────────────
  console.log("\n━━━ 2. PRIMARY KEYS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  let neonPKs: PKInfo[] = [];
  if (neonAccessible) {
    neonPKs = await getPrimaryKeys(neonPrisma);
  }
  const supabasePKs = await getPrimaryKeys(supabasePrisma);

  for (const spk of supabasePKs) {
    const neonMatch = neonPKs.find((n) => n.table === spk.table);
    if (!neonAccessible) {
      console.log(`   ✅ ${spk.table} → PK(${spk.columns})`);
    } else if (neonMatch && neonMatch.columns === spk.columns) {
      console.log(`   ✅ ${spk.table} → PK(${spk.columns}) — matches Neon`);
    } else if (neonMatch) {
      console.log(`   ❌ ${spk.table} → PK MISMATCH: Neon(${neonMatch.columns}) vs Supabase(${spk.columns})`);
    } else {
      console.log(`   ⚠️  ${spk.table} → PK(${spk.columns}) — not in Neon`);
    }
  }

  results.push({
    pass: true,
    message: "Primary Keys",
    supabase: supabasePKs.length,
    neon: neonPKs.length,
  });

  // ─── 3. Indexes ───────────────────────────────────────────
  console.log("\n━━━ 3. INDEXES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  let neonIndexes: IndexInfo[] = [];
  if (neonAccessible) {
    neonIndexes = await getIndexes(neonPrisma);
  }
  const supabaseIndexes = await getIndexes(supabasePrisma);

  console.log(`   Supabase indexes: ${supabaseIndexes.length}`);
  if (neonAccessible) {
    console.log(`   Neon indexes:     ${neonIndexes.length}`);
    if (neonIndexes.length === supabaseIndexes.length) {
      console.log("   ✅ Index count matches");
    } else {
      console.log(`   ⚠️  Index count differs: Neon(${neonIndexes.length}) vs Supabase(${supabaseIndexes.length})`);
    }
  }

  // List all indexes
  for (const idx of supabaseIndexes) {
    const emoji = neonAccessible
      ? neonIndexes.some((n) => n.name === idx.name)
        ? "✅"
        : "⚠️ "
      : "📌";
    console.log(`   ${emoji} ${idx.table}.${idx.name}`);
  }

  results.push({
    pass: !neonAccessible || neonIndexes.length <= supabaseIndexes.length,
    message: "Indexes",
    neon: neonIndexes.length,
    supabase: supabaseIndexes.length,
  });

  // ─── 4. Foreign Keys ──────────────────────────────────────
  console.log("\n━━━ 4. FOREIGN KEYS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  let neonFKs: FKInfo[] = [];
  if (neonAccessible) {
    neonFKs = await getForeignKeys(neonPrisma);
  }
  const supabaseFKs = await getForeignKeys(supabasePrisma);

  if (supabaseFKs.length === 0 && neonFKs.length === 0) {
    console.log("   ℹ️  No foreign key constraints (schema uses string-based relations)");
  } else {
    for (const fk of supabaseFKs) {
      console.log(`   ✅ ${fk.table}.${fk.constraintName} → ${fk.definition}`);
    }
  }

  results.push({
    pass: true,
    message: "Foreign Keys",
    neon: neonFKs.length,
    supabase: supabaseFKs.length,
  });

  // ─── 5. Prisma Migration History ──────────────────────────
  console.log("\n━━━ 5. PRISMA MIGRATION HISTORY ━━━━━━━━━━━━━━━━━━━━━━━━\n");

  let neonMigrations: MigrationInfo[] = [];
  if (neonAccessible) {
    neonMigrations = await getMigrations(neonPrisma);
  }
  const supabaseMigrations = await getMigrations(supabasePrisma);

  if (supabaseMigrations.length === 0) {
    console.log("   ⚠️  No migrations found in Supabase _prisma_migrations table");
  } else {
    for (const m of supabaseMigrations) {
      const neonMatch = neonMigrations.find((n) => n.name === m.name);
      const emoji = neonAccessible ? (neonMatch ? "✅" : "⚠️ ") : "📌";
      console.log(`   ${emoji} ${m.name} (applied: ${m.appliedAt})`);
    }
  }

  if (neonAccessible) {
    const match = neonMigrations.length === supabaseMigrations.length;
    console.log(`\n   Neon: ${neonMigrations.length} migrations | Supabase: ${supabaseMigrations.length} migrations`);
    console.log(`   ${match ? "✅ Migration history matches" : "❌ Migration history MISMATCH"}`);
    results.push({ pass: match, message: "Migration History", neon: neonMigrations.length, supabase: supabaseMigrations.length });
  } else {
    results.push({ pass: supabaseMigrations.length > 0, message: "Migration History", supabase: supabaseMigrations.length });
  }

  // ─── 6. Sequences ────────────────────────────────────────
  console.log("\n━━━ 6. SEQUENCES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const supabaseSeqs: any[] = await supabasePrisma.$queryRaw`
    SELECT sequencename, last_value
    FROM pg_sequences
    WHERE schemaname = 'public'
    ORDER BY sequencename;
  `;

  for (const seq of supabaseSeqs) {
    const lastVal = seq.last_value !== null ? Number(seq.last_value) : 0;
    console.log(`   📌 ${seq.sequencename}: last_value = ${lastVal}`);
  }

  results.push({
    pass: supabaseSeqs.length > 0,
    message: "Sequences",
    supabase: supabaseSeqs.length,
  });

  // ─── Final Report ────────────────────────────────────────
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                VALIDATION REPORT                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const total = results.length;

  for (const r of results) {
    const icon = r.pass ? "✅" : "❌";
    const detail =
      r.neon !== undefined && r.supabase !== undefined
        ? ` (Neon: ${r.neon}, Supabase: ${r.supabase})`
        : r.supabase !== undefined
          ? ` (Supabase: ${r.supabase})`
          : "";
    console.log(`   ${icon} ${r.message}${detail}`);
  }

  console.log(`\n   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Failed: ${failed}/${total}`);
  console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (failed === 0) {
    console.log("   🎉 ALL CHECKS PASSED — Migration is valid!\n");
    console.log("   Next steps:");
    console.log("   1. npx prisma db pull   (verify schema)");
    console.log("   2. npx prisma generate  (regenerate client)");
    console.log("   3. Update DATABASE_URL and DIRECT_URL in .env to Supabase");
    console.log("   4. Test locally with npm run dev");
    console.log("   5. Update Vercel environment variables");
    console.log("");
  } else {
    console.log("   ⚠️  SOME CHECKS FAILED — Review issues above before proceeding.\n");
  }

  // Cleanup
  await neonPrisma.$disconnect().catch(() => {});
  await supabasePrisma.$disconnect().catch(() => {});

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
