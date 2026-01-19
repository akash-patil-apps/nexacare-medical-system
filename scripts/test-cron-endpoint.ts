// scripts/test-cron-endpoint.ts
// Test script for medicine reminder cron endpoint
import { config } from 'dotenv';
config();

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const CRON_API_KEY = process.env.CRON_API_KEY || 'your-secret-cron-key-change-in-production';

async function testCronEndpoint() {
  try {
    console.log('🧪 Testing medicine reminder cron endpoint...');
    console.log(`   URL: ${SERVER_URL}/api/cron/medicine-reminders`);
    console.log(`   API Key: ${CRON_API_KEY.substring(0, 10)}...`);

    const response = await fetch(`${SERVER_URL}/api/cron/medicine-reminders?key=${CRON_API_KEY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Cron endpoint test successful!');
      console.log('   Response:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Cron endpoint test failed!');
      console.error('   Status:', response.status);
      console.error('   Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error testing cron endpoint:', error.message);
    console.error('   Make sure the server is running!');
    process.exit(1);
  }
}

testCronEndpoint();
