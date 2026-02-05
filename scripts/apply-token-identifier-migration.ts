// scripts/apply-token-identifier-migration.ts
// Adds token_identifier to appointments and opd_queue_entries (OPD token spec)
import postgres from 'postgres';
import { config } from 'dotenv';

config();

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1, connect_timeout: 30 });

async function run() {
  try {
    await sql.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "token_identifier" text;`);
    await sql.unsafe(`ALTER TABLE "opd_queue_entries" ADD COLUMN IF NOT EXISTS "token_identifier" text;`);
    console.log('✅ token_identifier columns added (or already exist)');
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  } finally {
    await sql.end();
  }
  process.exit(0);
}

run();
