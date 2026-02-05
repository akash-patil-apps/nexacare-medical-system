// scripts/apply-patient-family-members-migration.ts
// Apply patient_family_members table migration
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

async function runMigration() {
  const filePath = join(__dirname, '../drizzle/0019_patient_family_members.sql');
  const raw = readFileSync(filePath, 'utf-8').replace(/^\s*--[^\n]*\n/gm, '').trim();
  // Split into statements: CREATE TABLE ... ); then each ALTER TABLE ...
  const statements = raw.split(/\s*;\s*\n\s*\n\s*/).map((s) => s.trim()).filter(Boolean);

  for (const statement of statements) {
    const stmt = statement.endsWith(';') ? statement : statement + ';';
    try {
      await sql.unsafe(stmt);
      console.log('✅ Executed statement');
    } catch (error: any) {
      if (
        error.code === '42P07' ||
        error.code === '42710' ||
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate')
      ) {
        console.log('⚠️  Object already exists, skipping...');
      } else {
        console.error('❌ Error:', error.message || error);
        throw error;
      }
    }
  }
  console.log('✅ Migration applied: patient_family_members');
}

runMigration()
  .then(() => {
    console.log('🎉 Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed:', err?.message || err);
    process.exit(1);
  })
  .finally(() => sql.end());
