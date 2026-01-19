// scripts/apply-lab-migration.ts
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_NQrYiJCf3kG0@ep-floral-fire-a1368kxn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 30,
});

async function applyMigration() {
  try {
    console.log('📦 Reading lab migration file...');
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/0013_big_sentinel.sql'),
      'utf-8'
    );

    console.log('🚀 Applying lab tables migration...');
    
    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.includes('CREATE TABLE IF NOT EXISTS'));

    // Only execute statements for lab tables
    const labTableStatements = statements.filter(s => 
      s.includes('lab_orders') || 
      s.includes('lab_order_items') || 
      s.includes('lab_samples') || 
      s.includes('lab_results') ||
      s.includes('ALTER TABLE "lab_reports"')
    );

    for (const statement of labTableStatements) {
      if (statement.trim()) {
        try {
          await sql.unsafe(statement);
          console.log('✅ Executed statement');
        } catch (error: any) {
          // Ignore "already exists" errors
          if (error.code === '42P07' || error.message?.includes('already exists')) {
            console.log('⚠️  Table/constraint already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
            throw error;
          }
        }
      }
    }

    console.log('✅ Lab migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
