// Script to add photos column to hospitals table
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addPhotosColumn() {
  try {
    console.log('🔄 Adding photos column to hospitals table...');
    
    // Check if column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'hospitals' AND column_name = 'photos'
    `);
    
    if (checkColumn.rows && checkColumn.rows.length > 0) {
      console.log('✅ photos column already exists');
      return;
    }
    
    // Add the column
    await db.execute(sql`
      ALTER TABLE hospitals 
      ADD COLUMN photos TEXT
    `);
    
    console.log('✅ Successfully added photos column to hospitals table');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('✅ photos column already exists');
    } else {
      console.error('❌ Error adding photos column:', error);
      throw error;
    }
  }
}

addPhotosColumn()
  .then(() => {
    console.log('✅ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

