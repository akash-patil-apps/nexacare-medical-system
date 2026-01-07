// Comprehensive seed script to populate database with test data
import { db } from '../server/db';
import { users, hospitals, doctors, patients, receptionists, labs, nurses } from '../shared/schema';
import { hashPassword } from '../server/utils/password';
import { eq } from 'drizzle-orm';

// Constants
const UNIVERSAL_PASSWORD = 'password123';
const MAHARASHTRA_CITIES = [
  'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 
  'Thane', 'Pimpri-Chinchwad', 'Kalyan-Dombivli', 'Vasai-Virar'
];

const SPECIALTIES = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Gynecology',
  'Dermatology', 'Ophthalmology', 'ENT', 'Psychiatry', 'Oncology',
  'Gastroenterology', 'Endocrinology', 'Urology', 'Pulmonology',
  'Emergency Medicine', 'Family Medicine', 'Internal Medicine', 
  'General Medicine', 'Anesthesiology', 'Radiology'
];

const FIRST_NAMES = [
  'Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Neha', 'Arjun', 'Kavita',
  'Suresh', 'Deepa', 'Manoj', 'Anita', 'Rohit', 'Meera', 'Kumar', 'Sarita',
  'Nitin', 'Uma', 'Leela', 'Pooja', 'Raj', 'Sita', 'Ravi', 'Lakshmi'
];

const LAST_NAMES = [
  'Kumar', 'Sharma', 'Patel', 'Singh', 'Verma', 'Reddy', 'Agarwal', 'Malhotra',
  'Jain', 'Iyer', 'Pillai', 'Gaikwad', 'Desai', 'Bansal', 'Chopra', 'Mehta'
];

// Helper functions
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMobileNumber(prefix: string, index: number): string {
  // prefix should be like "981000" and we want 10 digits total
  // So if prefix is "981000" (6 digits), we need 4 more digits
  const prefixLength = prefix.length;
  const remainingDigits = 10 - prefixLength;
  const suffix = String(index).padStart(remainingDigits, '0');
  const result = `${prefix}${suffix}`;
  // Ensure result is exactly 10 digits
  if (result.length !== 10) {
    throw new Error(`Invalid mobile number length: ${result} (${result.length} digits). Prefix: ${prefix}, Index: ${index}`);
  }
  return result;
}

function generateEmail(name: string, mobile: string): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  return `${cleanName}.${mobile}@nexacare.com`;
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Check if data already exists
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      const forceSeed = process.argv.includes('--force');
      if (!forceSeed) {
        console.log('⚠️  Database already contains data. Skipping seed.');
        console.log('   To force seed anyway, use: npm run seed -- --force');
        console.log('   Or use cleanup scripts to clear data first.');
        return;
      } else {
        console.log('⚠️  Force seeding enabled. Existing data will be kept.');
        console.log('   Note: This may create duplicate users if mobile numbers conflict.\n');
      }
    }

    // Hash password once
    const hashedPassword = await hashPassword(UNIVERSAL_PASSWORD);
    console.log('✅ Password hashed\n');

    // 1. Create Admin User
    console.log('👑 Creating admin user...');
    const [adminUser] = await db.insert(users).values({
      mobileNumber: '9876543210',
      email: 'system.administrator@nexacare.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      isVerified: true,
    }).returning();
    console.log(`✅ Admin created: ${adminUser.fullName} (${adminUser.mobileNumber})\n`);

    // 2. Create Hospitals with Hospital Admin Users
    console.log('🏥 Creating hospitals...');
    const hospitalData = [
      { name: 'Apollo Hospitals Mumbai', city: 'Mumbai', specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'] },
      { name: 'Fortis Healthcare Mumbai', city: 'Mumbai', specialties: ['Cardiology', 'Oncology', 'Emergency Medicine'] },
      { name: 'Kokilaben Hospital Mumbai', city: 'Mumbai', specialties: ['Family Medicine', 'Orthopedics', 'Oncology'] },
      { name: 'Manipal Hospital Mumbai', city: 'Mumbai', specialties: ['Neurology', 'Ophthalmology', 'ENT'] },
      { name: 'Sahyadri Hospital Pune', city: 'Pune', specialties: ['Cardiology', 'Gastroenterology', 'General Medicine'] },
      { name: 'Ruby Hall Clinic Pune', city: 'Pune', specialties: ['Pediatrics', 'Gynecology', 'Urology'] },
      { name: 'SevenHills Hospital Mumbai', city: 'Mumbai', specialties: ['Emergency Medicine', 'Internal Medicine', 'Psychiatry'] },
      { name: 'Wockhardt Hospital Mumbai', city: 'Mumbai', specialties: ['Cardiology', 'Pediatrics', 'Endocrinology'] },
      { name: 'Global Hospital Mumbai', city: 'Mumbai', specialties: ['Oncology', 'Neurology', 'Orthopedics'] },
      { name: 'Max Super Specialty Mumbai', city: 'Mumbai', specialties: ['Orthopedics', 'Gynecology', 'Dermatology'] },
    ];

    const createdHospitals: any[] = [];
    for (let i = 0; i < hospitalData.length; i++) {
      const hospital = hospitalData[i];
      const mobileNumber = generateMobileNumber('981000', i);
      const hospitalAdminName = `Hospital Admin ${i + 1}`;
      
      // Create hospital admin user
      const [hospitalAdmin] = await db.insert(users).values({
        mobileNumber,
        email: generateEmail(hospitalAdminName, mobileNumber),
        password: hashedPassword,
        fullName: hospitalAdminName,
        role: 'HOSPITAL',
        isVerified: true,
      }).returning();

      // Create hospital
      const [createdHospital] = await db.insert(hospitals).values({
        userId: hospitalAdmin.id,
        name: hospital.name,
        address: `${randomNumber(100, 999)} Main Street, ${hospital.city}`,
        city: hospital.city,
        state: 'Maharashtra',
        zipCode: `${randomNumber(400000, 499999)}`,
        licenseNumber: `MH-HOSP-${String(i + 1).padStart(4, '0')}`,
        contactEmail: generateEmail(hospital.name, mobileNumber),
        establishedYear: randomNumber(1980, 2010),
        totalBeds: randomNumber(100, 500),
        departments: JSON.stringify(hospital.specialties),
        services: JSON.stringify(['General Consultation', 'Emergency Care', 'Surgery', 'Diagnostics']),
        operatingHours: '24/7',
        emergencyServices: true,
        isVerified: true,
        isActive: true,
      }).returning();

      createdHospitals.push(createdHospital);
      console.log(`✅ Hospital ${i + 1}: ${hospital.name} (Admin: ${mobileNumber})`);
    }
    console.log(`\n✅ Created ${createdHospitals.length} hospitals\n`);

    // 3. Create Doctors (20 per hospital)
    console.log('👨‍⚕️ Creating doctors...');
    let doctorCount = 0;
    for (let hospitalIndex = 0; hospitalIndex < createdHospitals.length; hospitalIndex++) {
      const hospital = createdHospitals[hospitalIndex];
      const hospitalDataItem = hospitalData[hospitalIndex];
      
      // Create 20 doctors per hospital
      for (let doctorIndex = 0; doctorIndex < 20; doctorIndex++) {
        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);
        const fullName = `Dr. ${firstName} ${lastName}`;
        const mobileNumber = generateMobileNumber('982000', doctorCount);
        const specialty = randomElement(SPECIALTIES);
        
        // Create doctor user
        const [doctorUser] = await db.insert(users).values({
          mobileNumber,
          email: generateEmail(fullName, mobileNumber),
          password: hashedPassword,
          fullName,
          role: 'DOCTOR',
          isVerified: true,
        }).returning();

        // Create doctor record
        await db.insert(doctors).values({
          userId: doctorUser.id,
          hospitalId: hospital.id,
          specialty,
          licenseNumber: `MH-DOC-${String(doctorCount + 1).padStart(5, '0')}`,
          qualification: 'MBBS, MD',
          experience: randomNumber(5, 30),
          consultationFee: String(randomNumber(500, 2000)),
          workingHours: '09:00 AM - 06:00 PM',
          availableSlots: JSON.stringify([
            '09:00-09:30', '09:30-10:00', '10:00-10:30', '10:30-11:00',
            '11:00-11:30', '11:30-12:00', '02:00-02:30', '02:30-03:00',
            '03:00-03:30', '03:30-04:00', '04:00-04:30', '04:30-05:00'
          ]),
          status: randomElement(['in', 'out', 'busy']),
          languages: 'English, Hindi, Marathi',
          isAvailable: Math.random() > 0.2, // 80% available
          isVerified: true,
          approvalStatus: 'approved',
        });

        doctorCount++;
        if (doctorCount % 50 === 0) {
          console.log(`   Created ${doctorCount} doctors...`);
        }
      }
    }
    console.log(`\n✅ Created ${doctorCount} doctors\n`);

    // 4. Create Patients (100 patients)
    console.log('👤 Creating patients...');
    const createdPatients: any[] = [];
    for (let i = 0; i < 100; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const mobileNumber = generateMobileNumber('983000', i);
      const city = randomElement(MAHARASHTRA_CITIES);
      
      // Create patient user
      const [patientUser] = await db.insert(users).values({
        mobileNumber,
        email: generateEmail(fullName, mobileNumber),
        password: hashedPassword,
        fullName,
        role: 'PATIENT',
        isVerified: true,
      }).returning();

      // Create patient record
      const [patient] = await db.insert(patients).values({
        userId: patientUser.id,
        dateOfBirth: new Date(randomNumber(1950, 2010), randomNumber(0, 11), randomNumber(1, 28)),
        gender: randomElement(['Male', 'Female']),
        bloodGroup: randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
        height: String(randomNumber(150, 190)),
        weight: String(randomNumber(50, 100)),
        address: `${randomNumber(100, 999)} Street, ${city}`,
        city,
        state: 'Maharashtra',
        zipCode: `${randomNumber(400000, 499999)}`,
        emergencyContact: generateMobileNumber('983000', randomNumber(100, 999)),
        emergencyContactName: randomElement(FIRST_NAMES) + ' ' + randomElement(LAST_NAMES),
        emergencyRelation: randomElement(['Spouse', 'Parent', 'Sibling', 'Friend']),
      }).returning();

      createdPatients.push(patient);
      if ((i + 1) % 25 === 0) {
        console.log(`   Created ${i + 1} patients...`);
      }
    }
    console.log(`\n✅ Created ${createdPatients.length} patients\n`);

    // 5. Create Receptionists (2 per hospital)
    console.log('📋 Creating receptionists...');
    let receptionistCount = 0;
    for (let hospitalIndex = 0; hospitalIndex < createdHospitals.length; hospitalIndex++) {
      const hospital = createdHospitals[hospitalIndex];
      
      // Create 2 receptionists per hospital
      for (let recIndex = 0; recIndex < 2; recIndex++) {
        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);
        const fullName = `${firstName} ${lastName}`;
        const mobileNumber = generateMobileNumber('985000', receptionistCount);
        
        // Create receptionist user
        const [receptionistUser] = await db.insert(users).values({
          mobileNumber,
          email: generateEmail(fullName, mobileNumber),
          password: hashedPassword,
          fullName,
          role: 'RECEPTIONIST',
          isVerified: true,
        }).returning();

        // Create receptionist record
        await db.insert(receptionists).values({
          userId: receptionistUser.id,
          hospitalId: hospital.id,
          employeeId: `EMP-${hospital.id}-${recIndex + 1}`,
          department: 'Reception',
          shift: randomElement(['Morning', 'Evening', 'Night']),
          workingHours: '09:00 AM - 06:00 PM',
          isActive: true,
          dateOfJoining: new Date(randomNumber(2020, 2023), randomNumber(0, 11), randomNumber(1, 28)),
        });

        receptionistCount++;
      }
    }
    console.log(`\n✅ Created ${receptionistCount} receptionists\n`);

    // 6. Create Nurses (2 per hospital)
    console.log('👩‍⚕️ Creating nurses...');
    let nurseCount = 0;
    for (const hospital of hospitals) {
      // Create 2 nurses per hospital
      for (let j = 0; j < 2; j++) {
        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);
        const fullName = `${firstName} ${lastName}`;
        const mobileNumber = generateMobileNumber('986000', nurseCount);

        // Create nurse user
        const [nurseUser] = await db.insert(users).values({
          mobileNumber,
          email: generateEmail(fullName, mobileNumber),
          password: hashedPassword,
          fullName,
          role: 'NURSE',
          isVerified: true,
        }).returning();

        // Create nurse record
        await db.insert(nurses).values({
          userId: nurseUser.id,
          hospitalId: hospital.id,
          nursingDegree: randomElement(['BSc Nursing', 'GNM', 'Post Basic BSc', 'MSc Nursing']),
          licenseNumber: `NUR${String(nurseCount + 1).padStart(4, '0')}`,
          specialization: randomElement(['General Medicine', 'ICU', 'Emergency', 'Pediatrics', 'Maternity', 'Surgical', 'Cardiac', 'Oncology']),
          experience: randomNumber(1, 15),
          shiftType: randomElement(['day', 'night', 'rotation']),
          workingHours: randomElement(['8 hours/day', '12 hours/day', 'Rotating shifts']),
          wardPreferences: JSON.stringify([randomElement(['General', 'ICU', 'Emergency', 'Pediatrics', 'Maternity', 'Surgical'])]),
          skills: JSON.stringify([
            randomElement(['Vital Signs Monitoring', 'IV Cannulation', 'Medication Administration']),
            randomElement(['Wound Care', 'Patient Assessment', 'Emergency Response'])
          ]),
          languages: 'English,Hindi',
          certifications: JSON.stringify([randomElement(['BLS', 'ACLS', 'PALS', 'TNCC'])]),
          bio: `Experienced nurse with ${randomNumber(1, 15)} years in healthcare providing compassionate patient care.`,
        });

        nurseCount++;
      }
    }
    console.log(`\n✅ Created ${nurseCount} nurses\n`);

    // 7. Create Labs (10 labs)
    console.log('🔬 Creating labs...');
    for (let i = 0; i < 10; i++) {
      const labName = `${randomElement(['City', 'Central', 'Advanced', 'Metro', 'Prime'])} Lab ${i + 1}`;
      const city = randomElement(MAHARASHTRA_CITIES);
      const mobileNumber = generateMobileNumber('984000', i);
      const adminName = `Lab Admin ${i + 1}`;
      
      // Create lab admin user
      const [labAdmin] = await db.insert(users).values({
        mobileNumber,
        email: generateEmail(adminName, mobileNumber),
        password: hashedPassword,
        fullName: adminName,
        role: 'LAB',
        isVerified: true,
      }).returning();

      // Create lab (some linked to hospitals, some standalone)
      const hospital = i < createdHospitals.length ? createdHospitals[i] : null;
      
      await db.insert(labs).values({
        userId: labAdmin.id,
        hospitalId: hospital?.id || null,
        name: labName,
        address: `${randomNumber(100, 999)} Lab Street, ${city}`,
        city,
        state: 'Maharashtra',
        zipCode: `${randomNumber(400000, 499999)}`,
        licenseNumber: `MH-LAB-${String(i + 1).padStart(4, '0')}`,
        contactEmail: generateEmail(labName, mobileNumber),
        operatingHours: '08:00 AM - 08:00 PM',
        specializations: JSON.stringify(['Pathology', 'Radiology', 'Biochemistry']),
        testCategories: JSON.stringify(['Blood Tests', 'Urine Tests', 'Imaging', 'Biopsy']),
        isActive: true,
      });

      console.log(`✅ Lab ${i + 1}: ${labName} (${city})`);
    }
    console.log(`\n✅ Created 10 labs\n`);

    // Summary
    console.log('\n🎉 Database seeding completed successfully!\n');
    console.log('📊 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Admin Users: 1`);
    console.log(`✅ Hospitals: ${createdHospitals.length}`);
    console.log(`✅ Doctors: ${doctorCount}`);
    console.log(`✅ Patients: ${createdPatients.length}`);
    console.log(`✅ Receptionists: ${receptionistCount}`);
    console.log(`✅ Nurses: ${nurseCount}`);
    console.log(`✅ Labs: 10`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔑 Login Credentials:');
    console.log(`   Password for all users: ${UNIVERSAL_PASSWORD}`);
    console.log(`   Admin: 9876543210`);
    console.log(`   Hospitals: 9810000000 - 9810000009`);
    console.log(`   Doctors: 9820000000 - 982000${String(doctorCount - 1).padStart(4, '0')}`);
    console.log(`   Patients: 9830000000 - 9830000099`);
    console.log(`   Receptionists: 9850000000 - 985000${String(receptionistCount - 1).padStart(4, '0')}`);
    console.log(`   Nurses: 9860000000 - 986000${String(nurseCount - 1).padStart(4, '0')}`);
    console.log(`   Labs: 9840000000 - 9840000009\n`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seedDatabase().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

