// Script to verify and add missing IPD encounter columns
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function verifyColumns() {
  try {
    console.log('🔍 Checking if assigned_nurse_id column exists...');
    
    // Try to query the column to see if it exists
    try {
      const result: any = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ipd_encounters' 
        AND column_name IN ('assigned_nurse_id', 'assigned_at', 'assigned_by_user_id')
      `);
      
      // Handle different result formats
      const rows = Array.isArray(result) ? result : (result.rows || []);
      const existingColumns = rows.map((row: any) => row.column_name || row.columnName || row);
      console.log('✅ Existing columns:', existingColumns);
      
      const requiredColumns = ['assigned_nurse_id', 'assigned_at', 'assigned_by_user_id'];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns:', missingColumns);
        console.log('🔧 Adding missing columns...');
        
        // Add missing columns
        if (missingColumns.includes('assigned_nurse_id')) {
          await db.execute(sql`
            ALTER TABLE ipd_encounters 
            ADD COLUMN IF NOT EXISTS assigned_nurse_id INTEGER REFERENCES nurses(id)
          `);
          console.log('✅ Added assigned_nurse_id');
        }
        
        if (missingColumns.includes('assigned_at')) {
          await db.execute(sql`
            ALTER TABLE ipd_encounters 
            ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP
          `);
          console.log('✅ Added assigned_at');
        }
        
        if (missingColumns.includes('assigned_by_user_id')) {
          await db.execute(sql`
            ALTER TABLE ipd_encounters 
            ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users(id)
          `);
          console.log('✅ Added assigned_by_user_id');
        }
        
        // Add index
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_ipd_encounters_assigned_nurse 
          ON ipd_encounters(assigned_nurse_id) 
          WHERE assigned_nurse_id IS NOT NULL
        `);
        console.log('✅ Added index');
        
        console.log('✅ All columns added successfully!');
      } else {
        console.log('✅ All required columns exist!');
      }
    } catch (error: any) {
      console.error('❌ Error checking columns:', error.message);
      throw error;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyColumns();

