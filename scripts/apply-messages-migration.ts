// scripts/apply-messages-migration.ts
// Run this script to create the messages table for in-platform messaging
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

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/0020_messages_table.sql'),
      'utf-8'
    );

    console.log('🚀 Applying messages table migration...');

    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sql.unsafe(statement);
          console.log('✅ Executed statement');
        } catch (error: any) {
          if (
            error.code === '42P07' ||
            error.code === '42701' ||
            error.message?.includes('already exists') ||
            error.message?.includes('duplicate')
          ) {
            console.log('⚠️  Table/constraint already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
            throw error;
          }
        }
      }
    }

    console.log('✅ Messages table migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
