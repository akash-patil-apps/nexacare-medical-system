// Script to add pharmacist and radiology technician test accounts to existing database
import { db } from '../server/db';
import { users, pharmacists, radiologyTechnicians, hospitals } from '../shared/schema';
import { hashPassword } from '../server/utils/password';
import { eq } from 'drizzle-orm';

async function addHealthcareAccounts() {
  try {
    console.log('🏥 Adding pharmacist and radiology technician test accounts...\n');

    // Hash password once
    const hashedPassword = await hashPassword('password123');
    console.log('✅ Password hashed\n');

    // Get all hospitals
    const allHospitals = await db.select().from(hospitals);
    console.log(`Found ${allHospitals.length} hospitals\n`);

    let pharmacistCount = 0;
    let radiologyCount = 0;

    for (const hospital of allHospitals.slice(0, 10)) { // Limit to first 10 hospitals
      // Create 2 pharmacists per hospital
      for (let j = 0; j < 2; j++) {
        const firstNames = ['Priya', 'Anjali', 'Kavita', 'Sunita', 'Meera', 'Deepa', 'Uma', 'Lakshmi'];
        const lastNames = ['Patel', 'Sharma', 'Verma', 'Singh', 'Gupta', 'Jain', 'Reddy', 'Iyer'];

        const firstName = firstNames[pharmacistCount % firstNames.length];
        const lastName = lastNames[Math.floor(pharmacistCount / firstNames.length) % lastNames.length];
        const fullName = `${firstName} ${lastName}`;
        const mobileNumber = `987000${String(pharmacistCount).padStart(4, '0')}`;

        // Check if pharmacist user already exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.mobileNumber, mobileNumber))
          .limit(1);

        if (existingUser.length > 0) {
          console.log(`⏭️  Pharmacist ${fullName} (${mobileNumber}) already exists, skipping...`);
          pharmacistCount++;
          continue;
        }

        // Create pharmacist user
        const [pharmacistUser] = await db.insert(users).values({
          mobileNumber,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${mobileNumber}@nexacare.com`,
          password: hashedPassword,
          fullName,
          role: 'PHARMACIST',
          isVerified: true,
        }).returning();

        // Create pharmacist record
        await db.insert(pharmacists).values({
          userId: pharmacistUser.id,
          hospitalId: hospital.id,
          pharmacyDegree: ['BPharm', 'MPharm', 'PharmD'][pharmacistCount % 3],
          licenseNumber: `PHARM${String(pharmacistCount + 1).padStart(4, '0')}`,
          specialization: ['Clinical Pharmacy', 'Hospital Pharmacy', 'Oncology'][pharmacistCount % 3],
          experience: Math.floor(Math.random() * 10) + 1,
          shiftType: ['day', 'night', 'rotation'][pharmacistCount % 3],
          workingHours: ['8 hours/day', '12 hours/day', 'Rotating shifts'][pharmacistCount % 3],
          pharmacyType: 'hospital',
          languages: 'English,Hindi',
          certifications: JSON.stringify(['BCPS', 'BCACP'][pharmacistCount % 2]),
          bio: `Experienced pharmacist with ${Math.floor(Math.random() * 10) + 1} years in healthcare providing medication management and patient counseling.`,
        });

        console.log(`✅ Created pharmacist: ${fullName} (${mobileNumber}) - ${hospital.name}`);
        pharmacistCount++;
      }

      // Create 2 radiology technicians per hospital
      for (let j = 0; j < 2; j++) {
        const firstNames = ['Raj', 'Amit', 'Vikram', 'Suresh', 'Ravi', 'Arjun', 'Karan', 'Mohan'];
        const lastNames = ['Kumar', 'Singh', 'Sharma', 'Patel', 'Verma', 'Gupta', 'Jain', 'Reddy'];

        const firstName = firstNames[radiologyCount % firstNames.length];
        const lastName = lastNames[Math.floor(radiologyCount / firstNames.length) % lastNames.length];
        const fullName = `${firstName} ${lastName}`;
        const mobileNumber = `988000${String(radiologyCount).padStart(4, '0')}`;

        // Check if radiology technician user already exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.mobileNumber, mobileNumber))
          .limit(1);

        if (existingUser.length > 0) {
          console.log(`⏭️  Radiology technician ${fullName} (${mobileNumber}) already exists, skipping...`);
          radiologyCount++;
          continue;
        }

        // Create radiology technician user
        const [technicianUser] = await db.insert(users).values({
          mobileNumber,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${mobileNumber}@nexacare.com`,
          password: hashedPassword,
          fullName,
          role: 'RADIOLOGY_TECHNICIAN',
          isVerified: true,
        }).returning();

        // Create radiology technician record
        await db.insert(radiologyTechnicians).values({
          userId: technicianUser.id,
          hospitalId: hospital.id,
          radiologyDegree: ['B.Sc Radiology', 'Diploma Radiology', 'M.Sc Radiology'][radiologyCount % 3],
          licenseNumber: `RAD${String(radiologyCount + 1).padStart(4, '0')}`,
          specialization: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound'][radiologyCount % 4],
          experience: Math.floor(Math.random() * 12) + 1,
          shiftType: ['day', 'evening', 'rotation'][radiologyCount % 3],
          workingHours: ['8 hours/day', '12 hours/day', 'Rotating shifts'][radiologyCount % 3],
          modalities: JSON.stringify(['X-Ray', 'CT Scan', 'MRI'][radiologyCount % 3]),
          languages: 'English,Hindi',
          certifications: JSON.stringify(['ARRT', 'RDMS'][radiologyCount % 2]),
          bio: `Skilled radiology technician with ${Math.floor(Math.random() * 12) + 1} years of experience in medical imaging and patient care.`,
        });

        console.log(`✅ Created radiology technician: ${fullName} (${mobileNumber}) - ${hospital.name}`);
        radiologyCount++;
      }
    }

    console.log(`\n🎉 Successfully added ${pharmacistCount} pharmacist and ${radiologyCount} radiology technician test accounts!`);
    console.log('\n🔑 Pharmacist Test Credentials:');
    console.log('   Password for all pharmacists: password123');
    console.log('   Mobile numbers: 9870000000 - 9870000019');

    console.log('\n🔑 Radiology Technician Test Credentials:');
    console.log('   Password for all radiology technicians: password123');
    console.log('   Mobile numbers: 9880000000 - 9880000019');

    // Show sample accounts
    console.log('\n📱 Sample Pharmacist Accounts:');
    const samplePharmacists = await db
      .select({
        user: users,
        pharmacist: pharmacists,
        hospital: hospitals,
      })
      .from(pharmacists)
      .leftJoin(users, eq(pharmacists.userId, users.id))
      .leftJoin(hospitals, eq(pharmacists.hospitalId, hospitals.id))
      .limit(5);

    samplePharmacists.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.user?.fullName} - ${record.user?.mobileNumber} (${record.hospital?.name})`);
    });

    console.log('\n📱 Sample Radiology Technician Accounts:');
    const sampleTechnicians = await db
      .select({
        user: users,
        technician: radiologyTechnicians,
        hospital: hospitals,
      })
      .from(radiologyTechnicians)
      .leftJoin(users, eq(radiologyTechnicians.userId, users.id))
      .leftJoin(hospitals, eq(radiologyTechnicians.hospitalId, hospitals.id))
      .limit(5);

    sampleTechnicians.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.user?.fullName} - ${record.user?.mobileNumber} (${record.hospital?.name})`);
    });

  } catch (error) {
    console.error('❌ Error adding healthcare accounts:', error);
    throw error;
  }
}

addHealthcareAccounts().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});



