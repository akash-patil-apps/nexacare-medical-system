import { db } from '../server/db';

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Database connection successful!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  } finally {
    process.exit(0);
  }
}

testConnection();



