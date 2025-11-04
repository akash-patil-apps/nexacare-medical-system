// Quick script to verify all mobile numbers are 10 digits
import { db } from '../server/db';
import { users } from '../shared/schema';

async function verifyMobileNumbers() {
  try {
    const allUsers = await db.select({
      id: users.id,
      mobile: users.mobileNumber,
      name: users.fullName,
      role: users.role
    }).from(users);

    console.log('🔍 Verifying mobile numbers...\n');
    
    const issues: any[] = [];
    const correct: any[] = [];

    allUsers.forEach(user => {
      if (user.mobile.length === 10) {
        correct.push(user);
      } else {
        issues.push(user);
      }
    });

    console.log(`✅ Correct (10 digits): ${correct.length}`);
    console.log(`❌ Issues (not 10 digits): ${issues.length}\n`);

    if (issues.length > 0) {
      console.log('📋 Issues found:');
      issues.slice(0, 10).forEach(user => {
        console.log(`   ${user.name} (${user.role}): ${user.mobile} (${user.mobile.length} digits)`);
      });
      if (issues.length > 10) {
        console.log(`   ... and ${issues.length - 10} more`);
      }
    } else {
      console.log('✅ All mobile numbers are correct (10 digits)!');
      console.log('\n📋 Sample numbers:');
      correct.slice(0, 10).forEach(user => {
        console.log(`   ${user.name} (${user.role}): ${user.mobile}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyMobileNumbers().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

