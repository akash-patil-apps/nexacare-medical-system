// Script to fix mobile numbers that are longer than 10 digits
import { db } from '../server/db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function fixMobileNumbers() {
  try {
    console.log('🔍 Checking mobile numbers in database...\n');

    // Get all users with mobile numbers longer than 10 digits
    const allUsers = await db.select().from(users);
    
    let fixedCount = 0;
    const issues: string[] = [];

    for (const user of allUsers) {
      const mobile = user.mobileNumber;
      
      if (mobile.length > 10) {
        issues.push(`❌ ${user.fullName} (${user.role}): ${mobile} (${mobile.length} digits)`);
        
        // Fix: Take first 10 digits
        const fixedMobile = mobile.substring(0, 10);
        
        // Check if fixed number already exists
        const existing = await db.select().from(users)
          .where(sql`mobile_number = ${fixedMobile}`)
          .limit(1);
        
        if (existing.length > 0 && existing[0].id !== user.id) {
          console.log(`⚠️  Cannot fix ${user.fullName}: Fixed number ${fixedMobile} already exists`);
          continue;
        }
        
        // Update the mobile number
        await db.update(users)
          .set({ mobileNumber: fixedMobile })
          .where(sql`id = ${user.id}`);
        
        console.log(`✅ Fixed: ${user.fullName} - ${mobile} → ${fixedMobile}`);
        fixedCount++;
      } else if (mobile.length < 10) {
        issues.push(`⚠️  ${user.fullName} (${user.role}): ${mobile} (${mobile.length} digits - too short)`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total users checked: ${allUsers.length}`);
    console.log(`   Fixed numbers: ${fixedCount}`);
    console.log(`   Issues found: ${issues.length}`);

    if (issues.length > 0) {
      console.log('\n📋 Issues:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    if (fixedCount > 0) {
      console.log('\n✅ Mobile numbers fixed successfully!');
    } else {
      console.log('\n✅ All mobile numbers are correct (10 digits).');
    }

  } catch (error) {
    console.error('❌ Error fixing mobile numbers:', error);
    throw error;
  }
}

fixMobileNumbers().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

