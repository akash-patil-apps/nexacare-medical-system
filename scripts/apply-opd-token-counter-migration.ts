// scripts/apply-opd-token-counter-migration.ts
// Creates opd_token_counter table for atomic walk-in token assignment
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

const stmt = `
CREATE TABLE IF NOT EXISTS opd_token_counter (
  doctor_id integer NOT NULL REFERENCES doctors(id),
  appointment_date text NOT NULL,
  last_token integer NOT NULL DEFAULT 0,
  updated_at timestamp DEFAULT NOW(),
  PRIMARY KEY (doctor_id, appointment_date)
);
`;

async function run() {
  try {
    await sql.unsafe(stmt);
    console.log('✅ opd_token_counter table created (or already exists)');
  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  } finally {
    await sql.end();
  }
  process.exit(0);
}

run();
