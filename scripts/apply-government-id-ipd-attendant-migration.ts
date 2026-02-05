// scripts/apply-government-id-ipd-attendant-migration.ts
// Adds government_id_type, government_id_number to patients; attendant_name, attendant_mobile to ipd_encounters
import postgres from 'postgres';
import { config } from 'dotenv';

config();

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 30,
});

const statements = [
  `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "government_id_type" text`,
  `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "government_id_number" text`,
  `ALTER TABLE "ipd_encounters" ADD COLUMN IF NOT EXISTS "attendant_name" text`,
  `ALTER TABLE "ipd_encounters" ADD COLUMN IF NOT EXISTS "attendant_mobile" text`,
];

async function runMigration() {
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      console.log('✅', stmt.replace(/ADD COLUMN IF NOT EXISTS "([^"]+)" .*/, 'Added column $1'));
    } catch (error: any) {
      if (error.code === '42701' || error.message?.includes('already exists')) {
        console.log('⚠️  Column already exists, skipping:', stmt.match(/"([^"]+)"/)?.[1] || '');
      } else {
        console.error('❌ Error:', error.message || error);
        throw error;
      }
    }
  }
  console.log('✅ Migration applied: government_id + ipd_attendant');
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
