import { db } from '../server/db';
import { users, hospitals } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkHospitalAdmin(mobileNumber?: string) {
  try {
    let query = db
      .select({
        userId: users.id,
        mobileNumber: users.mobileNumber,
        fullName: users.fullName,
        role: users.role,
        hospitalId: hospitals.id,
        hospitalName: hospitals.name,
        hospitalCity: hospitals.city,
      })
      .from(users)
      .leftJoin(hospitals, eq(users.id, hospitals.userId))
      .where(eq(users.role, 'HOSPITAL'));

    if (mobileNumber) {
      query = query.where(eq(users.mobileNumber, mobileNumber)) as any;
    }

    const results = await query;

    if (mobileNumber) {
      if (results.length === 0) {
        console.log(`❌ No hospital admin found with mobile number: ${mobileNumber}`);
        return;
      }

      const admin = results[0];
      console.log(`\n✅ Found Hospital Admin:`);
      console.log(`   Mobile: ${admin.mobileNumber}`);
      console.log(`   Name: ${admin.fullName}`);
      console.log(`   User ID: ${admin.userId}`);
      console.log(`   Role: ${admin.role}`);
      
      if (admin.hospitalId && admin.hospitalName) {
        console.log(`\n🏥 Associated Hospital:`);
        console.log(`   Hospital ID: ${admin.hospitalId}`);
        console.log(`   Hospital Name: ${admin.hospitalName}`);
        console.log(`   City: ${admin.hospitalCity || 'N/A'}`);
      } else {
        console.log(`\n⚠️ No hospital profile found for this admin.`);
      }
    } else {
      console.log(`\n📋 All Hospital Admins (showing first 20):\n`);
      results.slice(0, 20).forEach((admin, idx) => {
        console.log(`${idx + 1}. ${admin.fullName} (${admin.mobileNumber})`);
        if (admin.hospitalName) {
          console.log(`   → ${admin.hospitalName}, ${admin.hospitalCity || 'N/A'}`);
        } else {
          console.log(`   → No hospital profile`);
        }
      });
      
      if (results.length > 20) {
        console.log(`\n... and ${results.length - 20} more`);
      }
    }
  } catch (error) {
    console.error('❌ Error checking hospital admin:', error);
  } finally {
    process.exit(0);
  }
}

// Get mobile number from command line argument or check for "Hospital Admin 1"
const mobileNumberToCheck = process.argv[2];

if (mobileNumberToCheck === '1' || mobileNumberToCheck === 'admin1') {
  // Search for "Hospital Admin 1" by name
  checkHospitalAdmin().then(() => {
    // This will show all, but we can filter in the query
    process.exit(0);
  });
} else if (mobileNumberToCheck) {
  checkHospitalAdmin(mobileNumberToCheck);
} else {
  console.log('Usage: npx tsx scripts/check-hospital-admin.ts [mobile_number|1]');
  console.log('Example: npx tsx scripts/check-hospital-admin.ts 9810001234');
  console.log('Example: npx tsx scripts/check-hospital-admin.ts 1  (to find "Hospital Admin 1")');
  process.exit(1);
}

