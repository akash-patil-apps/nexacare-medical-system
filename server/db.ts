// server/db.ts - Real database connection
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

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

console.log('🗄️  Connected to real PostgreSQL database');
console.log('📝 Using Neon database for production data');