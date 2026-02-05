// scripts/apply-messages-migration-direct.ts
// Direct SQL execution to create messages table
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

async function applyMigration() {
  try {
    console.log('🚀 Creating messages table directly...');
    
    // Create table with explicit schema
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "public"."messages" (
        "id" serial PRIMARY KEY NOT NULL,
        "sender_id" integer NOT NULL,
        "recipient_id" integer NOT NULL,
        "body" text NOT NULL,
        "read_at" timestamp,
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log('✅ Table created');

    // Add foreign key constraints
    try {
      await sql.unsafe(`
        ALTER TABLE "public"."messages" 
        ADD CONSTRAINT "messages_sender_id_users_id_fk" 
        FOREIGN KEY ("sender_id") 
        REFERENCES "public"."users"("id") 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION;
      `);
      console.log('✅ Added sender_id foreign key');
    } catch (error: any) {
      if (error.code === '42710' || error.message?.includes('already exists')) {
        console.log('⚠️  Sender foreign key already exists');
      } else {
        throw error;
      }
    }

    try {
      await sql.unsafe(`
        ALTER TABLE "public"."messages" 
        ADD CONSTRAINT "messages_recipient_id_users_id_fk" 
        FOREIGN KEY ("recipient_id") 
        REFERENCES "public"."users"("id") 
        ON DELETE CASCADE 
        ON UPDATE NO ACTION;
      `);
      console.log('✅ Added recipient_id foreign key');
    } catch (error: any) {
      if (error.code === '42710' || error.message?.includes('already exists')) {
        console.log('⚠️  Recipient foreign key already exists');
      } else {
        throw error;
      }
    }

    // Verify table was created
    const check = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      );
    `;
    
    if (check[0]?.exists) {
      console.log('✅ Messages table migration completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Table was not created');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
