// Script to add nurse test accounts to existing database
import { db } from '../server/db';
import { users, nurses, hospitals } from '../shared/schema';
import { hashPassword } from '../server/utils/password';
import { eq } from 'drizzle-orm';

async function addNurseAccounts() {
  try {
    console.log('👩‍⚕️ Adding nurse test accounts...\n');

    // Hash password once
    const hashedPassword = await hashPassword('password123');
    console.log('✅ Password hashed\n');

    // Get all hospitals
    const allHospitals = await db.select().from(hospitals);
    console.log(`Found ${allHospitals.length} hospitals\n`);

    let nurseCount = 0;

    for (const hospital of allHospitals.slice(0, 10)) { // Limit to first 10 hospitals
      // Create 2 nurses per hospital
      for (let j = 0; j < 2; j++) {
        const firstNames = ['Priya', 'Anita', 'Sunita', 'Kavita', 'Meera', 'Deepa', 'Uma', 'Lakshmi'];
        const lastNames = ['Sharma', 'Patel', 'Singh', 'Verma', 'Reddy', 'Iyer', 'Gaikwad', 'Desai'];

        const firstName = firstNames[nurseCount % firstNames.length];
        const lastName = lastNames[Math.floor(nurseCount / firstNames.length) % lastNames.length];
        const fullName = `${firstName} ${lastName}`;
        const mobileNumber = `986000${String(nurseCount).padStart(4, '0')}`;

        // Check if nurse user already exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.mobileNumber, mobileNumber))
          .limit(1);

        if (existingUser.length > 0) {
          console.log(`⏭️  Nurse ${fullName} (${mobileNumber}) already exists, skipping...`);
          nurseCount++;
          continue;
        }

        // Create nurse user
        const [nurseUser] = await db.insert(users).values({
          mobileNumber,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${mobileNumber}@nexacare.com`,
          password: hashedPassword,
          fullName,
          role: 'NURSE',
          isVerified: true,
        }).returning();

        // Create nurse record
        await db.insert(nurses).values({
          userId: nurseUser.id,
          hospitalId: hospital.id,
          nursingDegree: ['BSc Nursing', 'GNM', 'Post Basic BSc'][nurseCount % 3],
          licenseNumber: `NUR${String(nurseCount + 1).padStart(4, '0')}`,
          specialization: ['General Medicine', 'ICU', 'Emergency', 'Pediatrics', 'Maternity'][nurseCount % 5],
          experience: Math.floor(Math.random() * 15) + 1,
          shiftType: ['day', 'night', 'rotation'][nurseCount % 3],
          workingHours: ['8 hours/day', '12 hours/day', 'Rotating shifts'][nurseCount % 3],
          wardPreferences: JSON.stringify(['General Medicine', 'ICU', 'Emergency', 'Pediatrics'][nurseCount % 4]),
          skills: JSON.stringify(['Vital Signs Monitoring', 'IV Cannulation', 'Medication Administration', 'Patient Assessment'][nurseCount % 4]),
          languages: 'English,Hindi',
          certifications: JSON.stringify(['BLS', 'ACLS'][nurseCount % 2]),
          bio: `Experienced nurse providing compassionate patient care with ${Math.floor(Math.random() * 15) + 1} years of experience.`,
        });

        console.log(`✅ Created nurse: ${fullName} (${mobileNumber}) - ${hospital.name}`);
        nurseCount++;
      }
    }

    console.log(`\n🎉 Successfully added ${nurseCount} nurse test accounts!`);
    console.log('\n🔑 Nurse Test Credentials:');
    console.log('   Password for all nurses: password123');
    console.log('   Mobile numbers: 9860000000 - 9860000019');

    // Show sample accounts
    console.log('\n📱 Sample Nurse Accounts:');
    const sampleNurses = await db
      .select({
        user: users,
        nurse: nurses,
        hospital: hospitals,
      })
      .from(nurses)
      .leftJoin(users, eq(nurses.userId, users.id))
      .leftJoin(hospitals, eq(nurses.hospitalId, hospitals.id))
      .limit(5);

    sampleNurses.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.user?.fullName} - ${record.user?.mobileNumber} (${record.hospital?.name})`);
    });

  } catch (error) {
    console.error('❌ Error adding nurse accounts:', error);
    throw error;
  }
}

addNurseAccounts().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
