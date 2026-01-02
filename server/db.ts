// server/db.ts - Real database connection
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import * as dotenv from "dotenv";

// Ensure DATABASE_URL from .env is available at runtime (drizzle-kit already loads .env in drizzle.config.ts)
dotenv.config();

// Create database connection with fallback
const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_NQrYiJCf3kG0@ep-floral-fire-a1368kxn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Configure postgres with timeout and connection settings
const sql = postgres(connectionString, {
  connect_timeout: 15, // 15 seconds connection timeout
  idle_timeout: 20, // 20 seconds idle timeout
  max_lifetime: 60 * 30, // 30 minutes max connection lifetime
  max: 10, // Maximum number of connections in the pool
  statement_timeout: 15000, // Fail fast if any statement takes > 15s
  prepare: false, // Disable prepared statements for faster queries (can help with connection issues)
  connection: {
    application_name: 'nexacare-medical-system',
  },
});

export const db = drizzle(sql, { schema });

function redactDbUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host;
    const dbName = u.pathname?.replace(/^\//, '') || '';
    return `${u.protocol}//${host}/${dbName}`;
  } catch {
    return 'invalid-url';
  }
}

async function ensureAppointmentRescheduleColumns() {
  try {
    // Idempotent: safe to run on every boot.
    await sql.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_at" timestamp;`);
    await sql.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_from_date" timestamp;`);
    await sql.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_from_time_slot" text;`);
    await sql.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reschedule_reason" text;`);
    await sql.unsafe(`ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_by" integer;`);

    await sql.unsafe(`
DO $$
BEGIN
  ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_rescheduled_by_users_id_fk"
  FOREIGN KEY ("rescheduled_by")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);
    console.log('✅ DB ensured reschedule columns exist on appointments');
  } catch (e) {
    // Best-effort: don't crash server if migrations/DDL are restricted.
    console.warn('⚠️ Could not ensure reschedule columns (continuing):', e);
  }
}

console.log('🗄️  Connected to real PostgreSQL database');
console.log('📝 Using Neon database for production data');
console.log('🧩 DB target:', redactDbUrl(connectionString));
void ensureAppointmentRescheduleColumns();