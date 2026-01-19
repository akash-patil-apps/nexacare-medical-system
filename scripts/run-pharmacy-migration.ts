// scripts/run-pharmacy-migration.ts
// Run this script to manually apply pharmacy tables migration
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || '');

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/0013_pharmacy_tables_only.sql'),
      'utf-8'
    );

    console.log('🚀 Running migration...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
