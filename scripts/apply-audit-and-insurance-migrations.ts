// scripts/apply-audit-and-insurance-migrations.ts
// Manually apply audit_logs and insurance module migrations
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 30,
});

async function runFile(relativePath: string, label: string) {
  console.log(`📦 Reading migration file for ${label}...`);
  const filePath = join(__dirname, relativePath);
  const migrationSQL = readFileSync(filePath, 'utf-8');

  console.log(`🚀 Applying migration: ${label} (${relativePath})...`);

  // If the file uses drizzle's "--> statement-breakpoint", split on that.
  // Otherwise, run the whole file as one batch.
  const rawStatements = migrationSQL.includes('--> statement-breakpoint')
    ? migrationSQL.split('--> statement-breakpoint')
    : [migrationSQL];

  const statements = rawStatements
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement.trim()) continue;
    try {
      await sql.unsafe(statement);
      console.log('✅ Executed statement');
    } catch (error: any) {
      // Ignore "already exists" / duplicate errors so script is idempotent
      if (
        error.code === '42P07' ||
        error.code === '42710' ||
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate')
      ) {
        console.log('⚠️  Object already exists, skipping...');
      } else {
        console.error('❌ Error executing statement:', error.message || error);
        throw error;
      }
    }
  }

  console.log(`✅ Migration applied: ${label}`);
}

async function applyMigrations() {
  try {
    // 1) audit_logs table
    await runFile('../drizzle/0017_audit_logs_enterprise.sql', 'audit_logs');
    // 2) insurance module tables
    await runFile('../drizzle/0018_insurance_module.sql', 'insurance module');

    console.log('🎉 All requested migrations completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migrations failed:', error.message || error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigrations();

