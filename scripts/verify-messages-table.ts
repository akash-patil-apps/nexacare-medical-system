// scripts/verify-messages-table.ts
// Verify the messages table exists
import postgres from 'postgres';
import { config } from 'dotenv';

config();

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function verifyTable() {
  try {
    console.log('🔍 Checking if messages table exists...');
    
    // Check if table exists
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      );
    `;
    
    const exists = result[0]?.exists;
    
    if (exists) {
      console.log('✅ Messages table exists!');
      
      // Get table structure
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'messages'
        ORDER BY ordinal_position;
      `;
      
      console.log('\n📋 Table structure:');
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Count rows
      const count = await sql`SELECT COUNT(*) as count FROM messages`;
      console.log(`\n📊 Total messages: ${count[0]?.count || 0}`);
    } else {
      console.log('❌ Messages table does NOT exist!');
      console.log('💡 Run: npx tsx scripts/apply-messages-migration.ts');
    }
    
    process.exit(exists ? 0 : 1);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

verifyTable();
