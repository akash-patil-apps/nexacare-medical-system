import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { 
  users, hospitals, doctors, patients, labs, receptionists,
  appointments, prescriptions, labReports, notifications, otpVerifications,
  states, cities
} from "../shared/schema";
import bcrypt from "bcryptjs";
import type { User, Hospital, Doctor, Patient, Lab, Receptionist } from "../shared/schema";

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/nexacare';
const sql = postgres(connectionString);
const db = drizzle(sql);

// Maharashtra cities data
const maharashtraCities = [
  "Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", 
  "Amravati", "Kolhapur", "Sangli", "Malegaon", "Jalgaon", "Akola",
  "Latur", "Ahmadnagar", "Dhule", "Ichalkaranji", "Parbhani", "Jalna",
  "Bhusawal", "Chandrapur", "Beed", "Amalner", "Ulhasnagar", "Panvel"
];

// Hospital names (mix of real and fictional)
const hospitalNames = [
  "Apollo Hospitals", "Fortis Healthcare", "Kokilaben Hospital", "Lilavati Hospital",
  "Sahyadri Hospital", "Jehangir Hospital", "Ruby Hall Clinic", "Deenanath Hospital",
  "Max Super Specialty", "Wockhardt Hospital", "Manipal Hospital", "Columbia Asia",
  "Aster Hospital", "Narayana Health", "Global Hospital", "Medanta Hospital"
];

// Indian names for realistic data
const indianFirstNames = [
  "Rajesh", "Priya", "Arjun", "Sneha", "Vikram", "Anita", "Rahul", "Deepa",
  "Suresh", "Meera", "Kiran", "Sunita", "Amit", "Pooja", "Vijay", "Rekha",
  "Sanjay", "Kavita", "Manoj", "Shilpa", "Ravi", "Neha", "Prakash", "Swati",
  "Nikhil", "Shruti", "Ankit", "Pallavi", "Rohit", "Sonal", "Gaurav", "Ritu"
];

const indianLastNames = [
  "Patil", "Sharma", "Singh", "Kumar", "Gupta", "Agarwal", "Joshi", "Desai",
  "Reddy", "Mehta", "Pandey", "Verma", "Yadav", "Mishra", "Jain", "Malhotra",
  "Nair", "Iyer", "Menon", "Kulkarni", "Bhosale", "Gaikwad", "Chavan", "Pawar"
];

// Medical specialties
const specialties = [
  "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Dermatology",
  "Oncology", "Psychiatry", "ENT", "General Medicine", "Gynecology",
  "Urology", "Ophthalmology", "Gastroenterology", "Pulmonology", "Endocrinology"
];

// Common medications
const medications = [
  { name: "Paracetamol", dosage: "500mg", form: "Tablet" },
  { name: "Amoxicillin", dosage: "250mg", form: "Capsule" },
  { name: "Metformin", dosage: "500mg", form: "Tablet" },
  { name: "Amlodipine", dosage: "5mg", form: "Tablet" },
  { name: "Omeprazole", dosage: "20mg", form: "Capsule" },
  { name: "Atorvastatin", dosage: "10mg", form: "Tablet" },
  { name: "Losartan", dosage: "50mg", form: "Tablet" },
  { name: "Cetirizine", dosage: "10mg", form: "Tablet" },
  { name: "Ibuprofen", dosage: "400mg", form: "Tablet" },
  { name: "Pantoprazole", dosage: "40mg", form: "Tablet" }
];

// Lab test types
const labTests = [
  { name: "Complete Blood Count", category: "Hematology", normalRange: "Normal" },
  { name: "Lipid Profile", category: "Biochemistry", normalRange: "Normal" },
  { name: "Blood Sugar (Fasting)", category: "Biochemistry", normalRange: "70-100 mg/dL" },
  { name: "Thyroid Function Test", category: "Endocrinology", normalRange: "Normal" },
  { name: "Liver Function Test", category: "Biochemistry", normalRange: "Normal" },
  { name: "Kidney Function Test", category: "Biochemistry", normalRange: "Normal" },
  { name: "ECG", category: "Cardiology", normalRange: "Normal Rhythm" },
  { name: "Chest X-Ray", category: "Radiology", normalRange: "Clear" },
  { name: "Urine Analysis", category: "Pathology", normalRange: "Normal" },
  { name: "Hemoglobin", category: "Hematology", normalRange: "12-16 g/dL" }
];

// Lab names
const labNames = [
  "Apollo Diagnostics", "SRL Labs", "Dr. Lal PathLabs", "Thyrocare",
  "Metropolis Healthcare", "Suburban Diagnostics", "iGenetic Diagnostics",
  "Unipath Speciality Laboratory", "Suraksha Diagnostics", "AccuHealth Labs"
];

// Helper functions
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateIndianName(): string {
  const firstName = getRandomElement(indianFirstNames);
  const lastName = getRandomElement(indianLastNames);
  return `${firstName} ${lastName}`;
}

function generateEmail(name: string, role: string, index?: number): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, '.');
  if (index !== undefined) {
    return `${cleanName}.${role}${index + 1}@nexacare.com`;
  }
  return `${cleanName}.${role}@nexacare.com`;
}

function generatePhoneNumber(startDigit: string = "98", index: number = 0): string {
  // Generate sequential phone numbers for testing
  const baseNumber = parseInt(startDigit + "0000000");
  return (baseNumber + index).toString();
}

async function seedMaharashtraData() {
  console.log('🏥 Starting Maharashtra medical data seeding...');
  
  try {
    // Get Maharashtra state ID
    const maharashtraState = await db.select().from(states).where(eq(states.name, "Maharashtra")).limit(1);
    if (maharashtraState.length === 0) {
      throw new Error("Maharashtra state not found. Please seed cities first.");
    }
    const stateId = maharashtraState[0].id;

    // Get cities in Maharashtra
    const maharashtraCitiesData = await db.select().from(cities).where(eq(cities.stateId, stateId));
    console.log(`📍 Found ${maharashtraCitiesData.length} cities in Maharashtra`);

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.delete(otpVerifications);
    await db.delete(notifications);
    await db.delete(labReports);
    await db.delete(prescriptions);
    await db.delete(appointments);
    await db.delete(receptionists);
    await db.delete(patients);
    await db.delete(doctors);
    await db.delete(labs);
    await db.delete(hospitals);
    await db.delete(users);

    // 1. Create Users with Login Credentials
    console.log('👥 Creating users with login credentials...');
    
    // Admin user
    const adminUser = await db.insert(users).values({
      fullName: "System Administrator",
      email: "admin@nexacare.com",
      mobileNumber: "9876543210",
      password: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
      isVerified: true,
    }).returning();

    // Hospital users (15 hospitals)
    const hospitalUsers: User[] = [];
    for (let i = 0; i < 15; i++) {
      const name = `Hospital Admin ${i + 1}`;
      const user = await db.insert(users).values({
        fullName: name,
        email: generateEmail(name, "hospital", i),
        mobileNumber: generatePhoneNumber("981", i),
        password: await bcrypt.hash("hospital123", 10),
        role: "HOSPITAL",
        isVerified: true,
      }).returning();
      hospitalUsers.push(user[0]);
    }

    // Doctor users (40 doctors)
    const doctorUsers: User[] = [];
    for (let i = 0; i < 40; i++) {
      const name = generateIndianName();
      const user = await db.insert(users).values({
        fullName: `Dr. ${name}`,
        email: generateEmail(name, "doctor", i),
        mobileNumber: generatePhoneNumber("982", i),
        password: await bcrypt.hash("doctor123", 10),
        role: "DOCTOR",
        isVerified: true,
      }).returning();
      doctorUsers.push(user[0]);
    }

    // Patient users (100 patients)
    const patientUsers: User[] = [];
    for (let i = 0; i < 100; i++) {
      const name = generateIndianName();
      const user = await db.insert(users).values({
        fullName: name,
        email: generateEmail(name, "patient", i),
        mobileNumber: generatePhoneNumber("983", i),
        password: await bcrypt.hash("patient123", 10),
        role: "PATIENT",
        isVerified: true,
      }).returning();
      patientUsers.push(user[0]);
    }

    // Lab users (10 labs)
    const labUsers: User[] = [];
    for (let i = 0; i < 10; i++) {
      const name = `Lab Admin ${i + 1}`;
      const user = await db.insert(users).values({
        fullName: name,
        email: generateEmail(name, "lab", i),
        mobileNumber: generatePhoneNumber("984", i),
        password: await bcrypt.hash("lab123", 10),
        role: "LAB",
        isVerified: true,
      }).returning();
      labUsers.push(user[0]);
    }

    // Receptionist users (20 receptionists)
    const receptionistUsers: User[] = [];
    for (let i = 0; i < 20; i++) {
      const name = generateIndianName();
      const user = await db.insert(users).values({
        fullName: name,
        email: generateEmail(name, "receptionist", i),
        mobileNumber: generatePhoneNumber("985", i),
        password: await bcrypt.hash("receptionist123", 10),
        role: "RECEPTIONIST",
        isVerified: true,
      }).returning();
      receptionistUsers.push(user[0]);
    }

    console.log(`✅ Created ${1 + hospitalUsers.length + doctorUsers.length + patientUsers.length + labUsers.length + receptionistUsers.length} users`);

    // 2. Create Hospitals
    console.log('🏥 Creating hospitals...');
    const hospitalData: any[] = [];
    for (let i = 0; i < 15; i++) {
      const city = getRandomElement(maharashtraCitiesData);
      const hospitalName = `${getRandomElement(hospitalNames)} ${city.name}`;
      
      hospitalData.push({
        userId: hospitalUsers[i].id,
        name: hospitalName,
        address: `${Math.floor(Math.random() * 100) + 1}, ${city.name}`,
        city: city.name,
        state: "Maharashtra",
        zipCode: `${400000 + Math.floor(Math.random() * 999)}`,
        licenseNumber: `HOS${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
        contactEmail: hospitalUsers[i].email,
        website: `www.${hospitalName.toLowerCase().replace(/\s+/g, '')}.com`,
        establishedYear: 1990 + Math.floor(Math.random() * 30),
        totalBeds: Math.floor(Math.random() * 200) + 50,
        departments: JSON.stringify(["Emergency", "ICU", "Surgery", "Pediatrics", "Cardiology"]),
        services: JSON.stringify([
          "Emergency Care", "Surgery", "Diagnostics", "Pharmacy", 
          "Ambulance", "Blood Bank", "Radiology", "Laboratory"
        ]),
        operatingHours: JSON.stringify({
          "24x7": true,
          emergency: "Always Open",
          opd: "10:00 AM - 8:00 PM"
        }),
        emergencyServices: true,
        isActive: true,
      });
    }

    const insertedHospitals = await db.insert(hospitals).values(hospitalData).returning();
    console.log(`✅ Created ${insertedHospitals.length} hospitals`);

    // 3. Create Doctors
    console.log('👨‍⚕️ Creating doctors...');
    const doctorData: any[] = [];
    for (let i = 0; i < 40; i++) {
      const hospital = insertedHospitals[i % insertedHospitals.length];
      const specialty = specialties[i % specialties.length];
      
      doctorData.push({
        userId: doctorUsers[i].id,
        hospitalId: hospital.id,
        specialty: specialty,
        licenseNumber: `DOC${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
        qualification: "MBBS, MD",
        experience: Math.floor(Math.random() * 20) + 2,
        consultationFee: (Math.floor(Math.random() * 1000) + 500).toString(),
        isAvailable: Math.random() > 0.1,
        workingHours: JSON.stringify({
          monday: { start: "09:00", end: "18:00" },
          tuesday: { start: "09:00", end: "18:00" },
          wednesday: { start: "09:00", end: "18:00" },
          thursday: { start: "09:00", end: "18:00" },
          friday: { start: "09:00", end: "18:00" },
          saturday: { start: "09:00", end: "15:00" },
          sunday: { start: "10:00", end: "14:00" }
        }),
        availableSlots: JSON.stringify(["09:00-09:30", "09:30-10:00", "10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00", "14:00-14:30", "14:30-15:00", "15:00-15:30", "15:30-16:00", "16:00-16:30", "16:30-17:00", "17:00-17:30", "17:30-18:00"]),
        status: "active",
        languages: JSON.stringify(["English", "Hindi", "Marathi"]),
        awards: JSON.stringify(["Best Doctor 2023"]),
        bio: `Experienced ${specialty} specialist with extensive clinical practice.`,
      });
    }

    const insertedDoctors = await db.insert(doctors).values(doctorData).returning();
    console.log(`✅ Created ${insertedDoctors.length} doctors`);

    // 4. Create Patients
    console.log('👤 Creating patients...');
    const patientData: any[] = [];
    for (let i = 0; i < 100; i++) {
      const city = getRandomElement(maharashtraCitiesData);
      const birthDate = new Date(1950 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const isMale = Math.random() > 0.5;
      
      patientData.push({
        userId: patientUsers[i].id,
        dateOfBirth: birthDate,
        gender: isMale ? "Male" : "Female",
        bloodGroup: ["A+", "B+", "AB+", "O+", "A-", "B-", "AB-", "O-"][Math.floor(Math.random() * 8)],
        address: `${Math.floor(Math.random() * 100) + 1}, ${city.name}`,
        city: city.name,
        state: "Maharashtra",
        zipCode: `${400000 + Math.floor(Math.random() * 999)}`,
        emergencyContact: generatePhoneNumber("98" + (600 + i)),
        emergencyContactName: generateIndianName(),
        medicalHistory: Math.random() > 0.7 ? "Hypertension, Diabetes" : "No significant medical history",
        allergies: Math.random() > 0.8 ? "Penicillin, Dust" : "None known",
        height: (150 + Math.floor(Math.random() * 50)).toString(),
        weight: (50 + Math.floor(Math.random() * 40)).toString(),
        emergencyRelation: ["Spouse", "Parent", "Sibling", "Child"][Math.floor(Math.random() * 4)],
        currentMedications: JSON.stringify([]),
        chronicConditions: JSON.stringify([]),
        insuranceProvider: ["HealthCare Plus", "Bajaj Allianz", "ICICI Lombard", "HDFC Ergo"][Math.floor(Math.random() * 4)],
        insuranceNumber: `HC${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        occupation: ["Software Engineer", "Teacher", "Doctor", "Business Owner", "Student"][Math.floor(Math.random() * 5)],
        maritalStatus: ["Single", "Married", "Divorced", "Widowed"][Math.floor(Math.random() * 4)],
      });
    }

    const insertedPatients = await db.insert(patients).values(patientData).returning();
    console.log(`✅ Created ${insertedPatients.length} patients`);

    // 5. Create Labs
    console.log('🧪 Creating labs...');
    const labData: any[] = [];
    for (let i = 0; i < 10; i++) {
      const city = getRandomElement(maharashtraCitiesData);
      
      labData.push({
        userId: labUsers[i].id,
        name: labNames[i],
        address: `${Math.floor(Math.random() * 100) + 1}, ${city.name}`,
        city: city.name,
        state: "Maharashtra",
        zipCode: `${400000 + Math.floor(Math.random() * 999)}`,
        licenseNumber: `LAB${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
        contactEmail: labUsers[i].email,
        website: `www.${labNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
        establishedYear: 1995 + Math.floor(Math.random() * 25),
        services: JSON.stringify(["Blood Tests", "Pathology", "Microbiology", "Biochemistry", "Radiology"]),
        accreditation: "NABL Certified",
        isActive: true,
      });
    }

    const insertedLabs = await db.insert(labs).values(labData).returning();
    console.log(`✅ Created ${insertedLabs.length} labs`);

    // 6. Create Receptionists
    console.log('📞 Creating receptionists...');
    const receptionistData: any[] = [];
    for (let i = 0; i < 20; i++) {
      const hospital = insertedHospitals[i % insertedHospitals.length];
      
      receptionistData.push({
        userId: receptionistUsers[i].id,
        hospitalId: hospital.id,
        employeeId: `EMP${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
        department: ["OPD", "Emergency", "IPD", "Cardiology", "Pediatrics"][Math.floor(Math.random() * 5)],
        shift: ["Morning", "Afternoon", "Evening", "Night"][Math.floor(Math.random() * 4)],
        salary: (25000 + Math.floor(Math.random() * 15000)).toString(),
        joiningDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        isActive: true,
      });
    }

    const insertedReceptionists = await db.insert(receptionists).values(receptionistData).returning();
    console.log(`✅ Created ${insertedReceptionists.length} receptionists`);

    // 7. Create Appointments
    console.log('📅 Creating appointments...');
    const appointmentData: any[] = [];
    for (let i = 0; i < 200; i++) {
      const patient = getRandomElement(insertedPatients);
      const doctor = getRandomElement(insertedDoctors);
      const hospital = insertedHospitals.find(h => h.id === doctor.hospitalId);
      const receptionist = getRandomElement(insertedReceptionists.filter(r => r.hospitalId === hospital?.id));
      
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 30));
      
      const statuses = ["pending", "confirmed", "completed", "cancelled"];
      const types = ["online", "in-person"];
      const priorities = ["low", "normal", "high", "urgent"];
      
      appointmentData.push({
        patientId: patient.id,
        doctorId: doctor.id,
        hospitalId: hospital?.id,
        appointmentDate: appointmentDate,
        appointmentTime: `${10 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}-${10 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '30' : '00'}`,
        reason: ["General Checkup", "Follow-up", "New Consultation", "Emergency", "Vaccination"][Math.floor(Math.random() * 5)],
        status: getRandomElement(statuses),
        type: getRandomElement(types),
        notes: Math.random() > 0.7 ? "Patient requested morning slot" : null,
        createdBy: receptionist?.userId,
        receptionistId: receptionist?.id,
        timeSlot: `${10 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '00' : '30'}-${10 + Math.floor(Math.random() * 8)}:${Math.random() > 0.5 ? '30' : '00'}`,
        priority: getRandomElement(priorities),
        symptoms: ["Fever", "Chest pain", "Headache", "Cough", "Back pain", "Stomach ache"][Math.floor(Math.random() * 6)],
        confirmedAt: Math.random() > 0.3 ? new Date() : null,
        completedAt: Math.random() > 0.7 ? new Date() : null,
      });
    }

    const insertedAppointments = await db.insert(appointments).values(appointmentData).returning();
    console.log(`✅ Created ${insertedAppointments.length} appointments`);

    // 8. Create Prescriptions
    console.log('💊 Creating prescriptions...');
    const prescriptionData: any[] = [];
    for (let i = 0; i < 150; i++) {
      const appointment = getRandomElement(insertedAppointments);
      const doctor = insertedDoctors.find(d => d.id === appointment.doctorId);
      const hospital = insertedHospitals.find(h => h.id === appointment.hospitalId);
      const medication = getRandomElement(medications);
      
      prescriptionData.push({
        patientId: appointment.patientId,
        doctorId: doctor?.id,
        hospitalId: hospital?.id,
        diagnosis: ["Common Cold", "Hypertension", "Diabetes", "Fever", "Cough", "Headache", "Back Pain"][Math.floor(Math.random() * 7)],
        medications: JSON.stringify([{
          name: medication.name,
          dosage: medication.dosage,
          unit: "mg",
          frequency: "Twice daily",
          timing: "After meals",
          duration: "7 days",
          instructions: "Take with food",
          quantity: 14
        }]),
        instructions: "Take medications as prescribed. Follow up if symptoms persist.",
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
      });
    }

    const insertedPrescriptions = await db.insert(prescriptions).values(prescriptionData).returning();
    console.log(`✅ Created ${insertedPrescriptions.length} prescriptions`);

    // 9. Create Lab Reports
    console.log('🧪 Creating lab reports...');
    const labReportData: any[] = [];
    for (let i = 0; i < 100; i++) {
      const patient = getRandomElement(insertedPatients);
      const doctor = getRandomElement(insertedDoctors);
      const lab = getRandomElement(insertedLabs);
      const test = getRandomElement(labTests);
      
      labReportData.push({
        patientId: patient.id,
        doctorId: doctor.id,
        labId: lab.id,
        testName: test.name,
        testType: test.category,
        testDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        reportDate: new Date(),
        results: JSON.stringify({
          value: "Normal",
          unit: "mg/dL",
          normalRange: test.normalRange,
          status: "Normal"
        }),
        normalRanges: test.normalRange,
        status: "completed",
        reportUrl: `https://nexacare.com/reports/${Math.floor(Math.random() * 100000)}.pdf`,
        notes: "Results within normal limits",
      });
    }

    const insertedLabReports = await db.insert(labReports).values(labReportData).returning();
    console.log(`✅ Created ${insertedLabReports.length} lab reports`);

    // 10. Create Notifications
    console.log('🔔 Creating notifications...');
    const notificationData: any[] = [];
    for (let i = 0; i < 50; i++) {
      const user = getRandomElement([...doctorUsers, ...patientUsers, ...hospitalUsers]);
      
      notificationData.push({
        userId: user.id,
        title: ["Appointment Reminder", "Prescription Ready", "Lab Report Available", "Payment Due", "System Update"][Math.floor(Math.random() * 5)],
        message: "This is a sample notification message for testing purposes.",
        type: ["info", "warning", "success", "error"][Math.floor(Math.random() * 4)],
        isRead: Math.random() > 0.5,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000),
      });
    }

    const insertedNotifications = await db.insert(notifications).values(notificationData).returning();
    console.log(`✅ Created ${insertedNotifications.length} notifications`);

    console.log('\n🎉 Maharashtra Medical System Data Seeding Completed!');
    console.log('\n📋 LOGIN CREDENTIALS FOR TESTING:');
    console.log('==================================');
    console.log('🔐 ADMIN:');
    console.log('   Email: admin@nexacare.com');
    console.log('   Mobile: 9876543210');
    console.log('   Password: admin123');
    console.log('');
    console.log('🏥 HOSPITALS (Sample):');
    console.log('   Mobile: 9810000000');
    console.log('   Password: hospital123');
    console.log('');
    console.log('👨‍⚕️ DOCTORS (Sample):');
    console.log('   Mobile: 9820000000');
    console.log('   Password: doctor123');
    console.log('');
    console.log('👤 PATIENTS (Sample):');
    console.log('   Mobile: 9830000000');
    console.log('   Password: patient123');
    console.log('');
    console.log('🧪 LABS (Sample):');
    console.log('   Mobile: 9840000000');
    console.log('   Password: lab123');
    console.log('');
    console.log('📞 RECEPTIONISTS (Sample):');
    console.log('   Mobile: 9850000000');
    console.log('   Password: receptionist123');
    console.log('');
    console.log('📊 DATA SUMMARY:');
    console.log(`   👥 Users: ${1 + hospitalUsers.length + doctorUsers.length + patientUsers.length + labUsers.length + receptionistUsers.length}`);
    console.log(`   🏥 Hospitals: ${insertedHospitals.length}`);
    console.log(`   👨‍⚕️ Doctors: ${insertedDoctors.length}`);
    console.log(`   👤 Patients: ${insertedPatients.length}`);
    console.log(`   🧪 Labs: ${insertedLabs.length}`);
    console.log(`   📞 Receptionists: ${insertedReceptionists.length}`);
    console.log(`   📅 Appointments: ${insertedAppointments.length}`);
    console.log(`   💊 Prescriptions: ${insertedPrescriptions.length}`);
    console.log(`   🧪 Lab Reports: ${insertedLabReports.length}`);
    console.log(`   🔔 Notifications: ${insertedNotifications.length}`);
    console.log('');
    console.log('🎯 All data is focused on Maharashtra cities!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run the seeding function
seedMaharashtraData();
