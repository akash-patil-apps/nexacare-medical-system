// Quick script to check if user exists in database
import { db } from '../server/db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkUser() {
  try {
    const mobileNumber = '9833402458';
    
    console.log(`🔍 Checking for user: ${mobileNumber}`);
    
    const [user] = await db.select().from(users).where(eq(users.mobileNumber, mobileNumber)).limit(1);
    
    if (user) {
      console.log('✅ User found:');
      console.log('  - ID:', user.id);
      console.log('  - Name:', user.fullName);
      console.log('  - Role:', user.role);
      console.log('  - Mobile:', user.mobileNumber);
      console.log('  - Verified:', user.isVerified);
    } else {
      console.log('❌ User not found');
      
      // Check total users
      const allUsers = await db.select().from(users).limit(5);
      console.log(`\n📊 Total users in database: ${allUsers.length > 0 ? `${allUsers.length}+` : '0'}`);
      if (allUsers.length > 0) {
        console.log('\n📋 Sample users:');
        allUsers.forEach(u => {
          console.log(`  - ${u.mobileNumber}: ${u.fullName} (${u.role})`);
        });
      } else {
        console.log('\n⚠️  Database appears to be empty. You may need to run seed scripts.');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUser();

