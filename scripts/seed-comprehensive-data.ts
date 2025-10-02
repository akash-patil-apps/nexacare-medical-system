import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { 
  users, 
  hospitals, 
  doctors, 
  patients, 
  labs, 
  receptionists,
  appointments,
  prescriptions,
  labReports,
  notifications
} from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_NQrYiJCf3kG0@ep-floral-fire-a1368kxn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = postgres(connectionString);
const db = drizzle(sql);

// City configurations
const cities = [
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Pune', state: 'Maharashtra' },
  { name: 'Nashik', state: 'Maharashtra' },
  { name: 'Nagpur', state: 'Maharashtra' },
  { name: 'Aurangabad', state: 'Maharashtra' },
  { name: 'Thane', state: 'Maharashtra' },
  { name: 'Kolhapur', state: 'Maharashtra' },
  { name: 'Sangli', state: 'Maharashtra' }
];

// Hospital chains and names
const hospitalChains = [
  'Apollo Hospitals',
  'Fortis Healthcare',
  'Max Super Specialty',
  'Kokilaben Hospital',
  'Sahyadri Hospital',
  'Ruby Hall Clinic',
  'Manipal Hospital',
  'Aster Hospital',
  'Global Hospital',
  'Wockhardt Hospital',
  'Narayana Health',
  'Columbia Asia',
  'Medanta Hospital',
  'AIIMS',
  'Sir H.N. Reliance Foundation Hospital'
];

// Doctor specializations
const specializations = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'General Medicine',
  'Gynecology',
  'Neurology',
  'Oncology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Urology',
  'Anesthesiology',
  'Emergency Medicine',
  'Family Medicine',
  'Internal Medicine',
  'Ophthalmology',
  'ENT'
];

// Doctor names
const doctorFirstNames = [
  'Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Neha', 'Arjun', 'Kavita',
  'Suresh', 'Meera', 'Rohit', 'Anita', 'Kumar', 'Deepa', 'Manoj', 'Pooja',
  'Ashok', 'Ritu', 'Nitin', 'Shilpa', 'Vishal', 'Suman', 'Ravi', 'Kiran',
  'Gopal', 'Mala', 'Sandeep', 'Uma', 'Prakash', 'Leela', 'Rajendra', 'Sarita'
];

const doctorLastNames = [
  'Kumar', 'Sharma', 'Patel', 'Singh', 'Gupta', 'Agarwal', 'Verma', 'Malhotra',
  'Chopra', 'Bansal', 'Jain', 'Mehta', 'Reddy', 'Nair', 'Iyer', 'Pillai'
];

// Patient names
const patientFirstNames = [
  'Amit', 'Priya', 'Raj', 'Sunita', 'Vikram', 'Neha', 'Arjun', 'Kavita',
  'Suresh', 'Meera', 'Rohit', 'Anita', 'Kumar', 'Deepa', 'Manoj', 'Pooja',
  'Ashok', 'Ritu', 'Nitin', 'Shilpa', 'Vishal', 'Suman', 'Ravi', 'Kiran',
  'Gopal', 'Mala', 'Sandeep', 'Uma', 'Prakash', 'Leela', 'Rajendra', 'Sarita'
];

// Lab names
const labNames = [
  'SRL Diagnostics',
  'Dr. Lal PathLabs',
  'Thyrocare Technologies',
  'Metropolis Healthcare',
  'Apollo Diagnostics',
  'Quest Diagnostics',
  'Aarthi Scans & Labs',
  'Vijaya Diagnostic Centre',
  'Suburban Diagnostics',
  'Pathcare Labs'
];

// Generate random data
const getRandomElement = (array: any[]) => array[Math.floor(Math.random() * array.length)];
const getRandomElements = (array: any[], count: number) => {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const generateHospital = (chain: string, city: string, index: number) => {
  const hospitalName = `${chain} ${city}`;
  const userId = 1000 + Math.floor(Math.random() * 9000); // Random user ID
  
  return {
    userId: userId,
    name: hospitalName,
    address: `${Math.floor(Math.random() * 999) + 1}, ${city}`,
    city: city,
    state: 'Maharashtra',
    zipCode: `400${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    licenseNumber: `HOS${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
    contactEmail: `hospital.admin.${index}.${chain.toLowerCase().replace(/\s+/g, '')}@nexacare.com`,
    website: `www.${chain.toLowerCase().replace(/\s+/g, '')}${city.toLowerCase()}@nexacare.com`,
    establishedYear: Math.floor(Math.random() * 30) + 1990,
    totalBeds: Math.floor(Math.random() * 200) + 50,
    departments: JSON.stringify(getRandomElements(specializations, Math.floor(Math.random() * 8) + 5)),
    services: JSON.stringify(['Emergency Care', 'Surgery', 'Diagnostics', 'Pharmacy', 'Ambulance', 'Blood Bank', 'Radiology', 'Laboratory']),
    operatingHours: JSON.stringify({
      "24x7": true,
      "emergency": "Always Open",
      "opd": "10:00 AM - 8:00 PM"
    }),
    emergencyServices: Math.random() > 0.2, // 80% have emergency services
    isActive: true,
    isVerified: Math.random() > 0.3, // 70% are verified
    createdAt: new Date()
  };
};

const generateDoctor = (hospitalId: number, index: number) => {
  const firstName = getRandomElement(doctorFirstNames);
  const lastName = getRandomElement(doctorLastNames);
  const fullName = `Dr. ${firstName} ${lastName}`;
  const userId = 2000 + Math.floor(Math.random() * 8000);
  const specialty = getRandomElement(specializations);
  
  return {
    userId: userId,
    hospitalId: hospitalId,
    specialty: specialty,
    licenseNumber: `DOC${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
    qualification: 'MBBS, MD',
    experience: Math.floor(Math.random() * 20) + 1,
    consultationFee: (Math.floor(Math.random() * 500) + 100).toString(),
    isAvailable: Math.random() > 0.3, // 70% are available
    workingHours: '9:00 AM - 6:00 PM',
    availableSlots: JSON.stringify([
      '09:00-09:30', '09:30-10:00', '10:00-10:30', '10:30-11:00',
      '11:00-11:30', '11:30-12:00', '14:00-14:30', '14:30-15:00',
      '15:00-15:30', '15:30-16:00', '16:00-16:30', '16:30-17:00'
    ]),
    status: getRandomElement(['in', 'out', 'busy']),
    languages: JSON.stringify(['English', 'Hindi', 'Marathi']),
    awards: JSON.stringify([]),
    bio: `Experienced ${specialty} specialist with ${Math.floor(Math.random() * 20) + 1} years of practice.`,
    approvalStatus: 'approved',
    createdAt: new Date()
  };
};

const generatePatient = (index: number) => {
  const firstName = getRandomElement(patientFirstNames);
  const lastName = getRandomElement(doctorLastNames);
  const fullName = `${firstName} ${lastName}`;
  const userId = 3000 + Math.floor(Math.random() * 7000);
  const age = Math.floor(Math.random() * 60) + 18;
  const city = getRandomElement(cities).name;
  
  return {
    userId: userId,
    age: age,
    gender: getRandomElement(['Male', 'Female', 'Other']),
    bloodGroup: getRandomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    address: `${Math.floor(Math.random() * 999) + 1}, ${city}`,
    city: city,
    state: 'Maharashtra',
    zipCode: `400${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
    emergencyContact: `9876543${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    medicalHistory: JSON.stringify([]),
    allergies: JSON.stringify([]),
    currentMedications: JSON.stringify([]),
    insuranceProvider: getRandomElement(['Bajaj Allianz', 'HDFC Ergo', 'ICICI Lombard', 'Reliance General', 'Tata AIG', 'None']),
    insurancePolicyNumber: `POL${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
    createdAt: new Date()
  };
};

const generateUser = (fullName: string, mobileNumber: string, role: string) => {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);
  return {
    fullName: fullName,
    mobileNumber: mobileNumber,
    email: `${fullName.toLowerCase().replace(/\s+/g, '.')}.${timestamp}.${randomId}@nexacare.com`,
    password: bcrypt.hashSync('password123', 10),
    role: role,
    isVerified: true,
    createdAt: new Date()
  };
};

async function seedComprehensiveData() {
  console.log('🏥 Starting comprehensive medical data seeding...');
  
  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.delete(appointments);
    await db.delete(prescriptions);
    await db.delete(labReports);
    await db.delete(notifications);
    await db.delete(doctors);
    await db.delete(patients);
    await db.delete(receptionists);
    await db.delete(labs);
    await db.delete(hospitals);
    await db.delete(users);

    console.log('👥 Creating users...');
    const createdUsers: any[] = [];
    
    // Create admin user
    const adminUser = generateUser('System Administrator', '9876543210', 'ADMIN');
    const [admin] = await db.insert(users).values(adminUser).returning();
    createdUsers.push(admin);

    // Create hospitals and users for each city
    const createdHospitals: any[] = [];
    
    for (const city of cities) {
      console.log(`🏥 Creating hospitals for ${city.name}...`);
      
      // Create 12-15 hospitals per city
      const hospitalsPerCity = Math.floor(Math.random() * 4) + 12; // 12-15 hospitals
      
      for (let i = 0; i < hospitalsPerCity; i++) {
        const chain = getRandomElement(hospitalChains);
        const hospitalData = generateHospital(chain, city.name, i + 1);
        
        // Create hospital admin user
        const hospitalUser = generateUser(
          `Hospital Admin ${i + 1}`,
          `981000${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          'HOSPITAL'
        );
        const [hospitalAdmin] = await db.insert(users).values(hospitalUser).returning();
        
        // Create hospital with the admin user ID
        const hospitalWithUser = { ...hospitalData, userId: hospitalAdmin.id };
        const [hospital] = await db.insert(hospitals).values(hospitalWithUser).returning();
        createdHospitals.push(hospital);
        
        console.log(`  ✅ Created ${hospital.name}`);
        
        // Create 20 doctors for this hospital
        console.log(`  👨‍⚕️ Creating 20 doctors for ${hospital.name}...`);
        for (let j = 0; j < 20; j++) {
          const doctorData = generateDoctor(hospital.id, j + 1);
          
          // Create doctor user
          const doctorUser = generateUser(
            `Dr. ${getRandomElement(doctorFirstNames)} ${getRandomElement(doctorLastNames)}`,
            `982${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
            'DOCTOR'
          );
          const [doctorUserCreated] = await db.insert(users).values(doctorUser).returning();
          
          // Create doctor with user ID
          const doctorWithUser = { ...doctorData, userId: doctorUserCreated.id };
          await db.insert(doctors).values(doctorWithUser);
        }
      }
    }

    // Create patients
    console.log('👤 Creating patients...');
    for (let i = 0; i < 500; i++) {
      const patientData = generatePatient(i + 1);
      
      // Create patient user
      const patientUser = generateUser(
        `${getRandomElement(patientFirstNames)} ${getRandomElement(doctorLastNames)}`,
        `983${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
        'PATIENT'
      );
      const [patientUserCreated] = await db.insert(users).values(patientUser).returning();
      
      // Create patient with user ID
      const patientWithUser = { ...patientData, userId: patientUserCreated.id };
      await db.insert(patients).values(patientWithUser);
    }

    // Create labs
    console.log('🧪 Creating labs...');
    for (let i = 0; i < 50; i++) {
      const labName = getRandomElement(labNames);
      const city = getRandomElement(cities).name;
      
      // Create lab user
      const labUser = generateUser(
        `${labName} ${city}`,
        `984${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
        'LAB'
      );
      const [labUserCreated] = await db.insert(users).values(labUser).returning();
      
      // Create lab
      const labData = {
        userId: labUserCreated.id,
        name: `${labName} ${city}`,
        address: `${Math.floor(Math.random() * 999) + 1}, ${city}`,
        city: city,
        state: 'Maharashtra',
        zipCode: `400${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        licenseNumber: `LAB${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
        contactEmail: `lab.admin.${i + 1}.${labName.toLowerCase().replace(/\s+/g, '')}@nexacare.com`,
        website: `www.${labName.toLowerCase().replace(/\s+/g, '')}${city.toLowerCase()}@nexacare.com`,
        services: JSON.stringify(['Blood Tests', 'Urine Tests', 'X-Ray', 'CT Scan', 'MRI', 'Ultrasound']),
        operatingHours: JSON.stringify({
          "24x7": false,
          "weekdays": "7:00 AM - 8:00 PM",
          "weekends": "8:00 AM - 6:00 PM"
        }),
        isActive: true,
        isVerified: Math.random() > 0.2, // 80% are verified
        approvalStatus: 'approved',
        createdAt: new Date()
      };
      
      await db.insert(labs).values(labData);
    }

    // Create receptionists
    console.log('📞 Creating receptionists...');
    for (let i = 0; i < 100; i++) {
      const hospital = getRandomElement(createdHospitals);
      
      // Create receptionist user
      const receptionistUser = generateUser(
        `Receptionist ${i + 1}`,
        `985${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
        'RECEPTIONIST'
      );
      const [receptionistUserCreated] = await db.insert(users).values(receptionistUser).returning();
      
      // Create receptionist
      const receptionistData = {
        userId: receptionistUserCreated.id,
        hospitalId: hospital.id,
        employeeId: `REC${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
        shift: getRandomElement(['Morning', 'Evening', 'Night']),
        isActive: true,
        createdAt: new Date()
      };
      
      await db.insert(receptionists).values(receptionistData);
    }

    console.log('🎉 Comprehensive Medical System Data Seeding Completed!');
    console.log('');
    console.log('📊 DATA SUMMARY:');
    console.log('==================================');
    console.log(`👥 Users: ${createdUsers.length + 500 + 50 + 100 + (cities.length * 15 * 21)}`);
    console.log(`🏥 Hospitals: ${createdHospitals.length}`);
    console.log(`👨‍⚕️ Doctors: ${cities.length * 15 * 20}`);
    console.log(`👤 Patients: 500`);
    console.log(`🧪 Labs: 50`);
    console.log(`📞 Receptionists: 100`);
    console.log('');
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('==================================');
    console.log('🔐 ADMIN:');
    console.log('   Mobile: 9876543210');
    console.log('   Password: password123');
    console.log('');
    console.log('🏥 HOSPITALS: Multiple hospitals created across all cities');
    console.log('👨‍⚕️ DOCTORS: 20 doctors per hospital');
    console.log('👤 PATIENTS: 500 patients created');
    console.log('🧪 LABS: 50 labs created');
    console.log('📞 RECEPTIONISTS: 100 receptionists created');
    console.log('');
    console.log('🎯 All data is distributed across Maharashtra cities!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the seeding
seedComprehensiveData().catch(console.error);
