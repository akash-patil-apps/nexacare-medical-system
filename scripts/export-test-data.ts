// Script to export all test data from database to JSON/PDF
import { db } from '../server/db';
import { users, hospitals, doctors, patients, receptionists, labs } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function exportTestData() {
  try {
    console.log('📊 Exporting test data from database...\n');

    // Get all users
    console.log('🔍 Fetching users...');
    const allUsers = await db.select().from(users);
    console.log(`✅ Found ${allUsers.length} users`);

    // Get all hospitals
    console.log('🔍 Fetching hospitals...');
    const allHospitals = await db.select().from(hospitals);
    console.log(`✅ Found ${allHospitals.length} hospitals`);

    // Get all doctors
    console.log('🔍 Fetching doctors...');
    const allDoctors = await db.select().from(doctors);
    console.log(`✅ Found ${allDoctors.length} doctors`);

    // Get all patients
    console.log('🔍 Fetching patients...');
    const allPatients = await db.select().from(patients);
    console.log(`✅ Found ${allPatients.length} patients`);

    // Get all receptionists
    console.log('🔍 Fetching receptionists...');
    const allReceptionists = await db.select().from(receptionists);
    console.log(`✅ Found ${allReceptionists.length} receptionists`);

    // Get all labs
    console.log('🔍 Fetching labs...');
    const allLabs = await db.select().from(labs);
    console.log(`✅ Found ${allLabs.length} labs`);

    // Organize data by role
    const usersByRole: Record<string, any[]> = {
      ADMIN: [],
      HOSPITAL: [],
      DOCTOR: [],
      PATIENT: [],
      RECEPTIONIST: [],
      LAB: [],
    };

    allUsers.forEach(user => {
      if (user.role && usersByRole[user.role]) {
        usersByRole[user.role].push(user);
      }
    });

    // Build comprehensive data structure
    const testData = {
      summary: {
        totalUsers: allUsers.length,
        totalHospitals: allHospitals.length,
        totalDoctors: allDoctors.length,
        totalPatients: allPatients.length,
        totalReceptionists: allReceptionists.length,
        totalLabs: allLabs.length,
        usersByRole: {
          ADMIN: usersByRole.ADMIN.length,
          HOSPITAL: usersByRole.HOSPITAL.length,
          DOCTOR: usersByRole.DOCTOR.length,
          PATIENT: usersByRole.PATIENT.length,
          RECEPTIONIST: usersByRole.RECEPTIONIST.length,
          LAB: usersByRole.LAB.length,
        },
      },
      users: {
        all: allUsers,
        byRole: usersByRole,
      },
      hospitals: allHospitals,
      doctors: allDoctors,
      patients: allPatients,
      receptionists: allReceptionists,
      labs: allLabs,
    };

    // Print summary
    console.log('\n📋 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${testData.summary.totalUsers}`);
    console.log(`  - ADMIN: ${testData.summary.usersByRole.ADMIN}`);
    console.log(`  - HOSPITAL: ${testData.summary.usersByRole.HOSPITAL}`);
    console.log(`  - DOCTOR: ${testData.summary.usersByRole.DOCTOR}`);
    console.log(`  - PATIENT: ${testData.summary.usersByRole.PATIENT}`);
    console.log(`  - RECEPTIONIST: ${testData.summary.usersByRole.RECEPTIONIST}`);
    console.log(`  - LAB: ${testData.summary.usersByRole.LAB}`);
    console.log(`Total Hospitals: ${testData.summary.totalHospitals}`);
    console.log(`Total Doctors: ${testData.summary.totalDoctors}`);
    console.log(`Total Patients: ${testData.summary.totalPatients}`);
    console.log(`Total Receptionists: ${testData.summary.totalReceptionists}`);
    console.log(`Total Labs: ${testData.summary.totalLabs}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Export to JSON first
    const fs = await import('fs/promises');
    const jsonPath = './test-data-export.json';
    await fs.writeFile(jsonPath, JSON.stringify(testData, null, 2));
    console.log(`✅ Exported to JSON: ${jsonPath}`);

    // Generate readable text format for PDF
    let textContent = 'NEXACARE MEDICAL SYSTEM - TEST DATA EXPORT\n';
    textContent += '='.repeat(60) + '\n\n';
    textContent += `Export Date: ${new Date().toLocaleString()}\n\n`;

    // Summary
    textContent += 'SUMMARY\n';
    textContent += '-'.repeat(60) + '\n';
    textContent += `Total Users: ${testData.summary.totalUsers}\n`;
    textContent += `  - ADMIN: ${testData.summary.usersByRole.ADMIN}\n`;
    textContent += `  - HOSPITAL: ${testData.summary.usersByRole.HOSPITAL}\n`;
    textContent += `  - DOCTOR: ${testData.summary.usersByRole.DOCTOR}\n`;
    textContent += `  - PATIENT: ${testData.summary.usersByRole.PATIENT}\n`;
    textContent += `  - RECEPTIONIST: ${testData.summary.usersByRole.RECEPTIONIST}\n`;
    textContent += `  - LAB: ${testData.summary.usersByRole.LAB}\n`;
    textContent += `Total Hospitals: ${testData.summary.totalHospitals}\n`;
    textContent += `Total Doctors: ${testData.summary.totalDoctors}\n`;
    textContent += `Total Patients: ${testData.summary.totalPatients}\n`;
    textContent += `Total Receptionists: ${testData.summary.totalReceptionists}\n`;
    textContent += `Total Labs: ${testData.summary.totalLabs}\n\n`;

    // Admin Users
    if (usersByRole.ADMIN.length > 0) {
      textContent += '\nADMIN USERS\n';
      textContent += '-'.repeat(60) + '\n';
      usersByRole.ADMIN.forEach((user, idx) => {
        textContent += `${idx + 1}. ${user.fullName}\n`;
        textContent += `   Mobile: ${user.mobileNumber}\n`;
        textContent += `   Email: ${user.email}\n`;
        textContent += `   Role: ${user.role}\n`;
        textContent += `   Verified: ${user.isVerified ? 'Yes' : 'No'}\n\n`;
      });
    }

    // Hospital Users
    if (usersByRole.HOSPITAL.length > 0) {
      textContent += '\nHOSPITAL ADMIN USERS\n';
      textContent += '-'.repeat(60) + '\n';
      usersByRole.HOSPITAL.forEach((user, idx) => {
        const hospital = allHospitals.find(h => h.userId === user.id);
        textContent += `${idx + 1}. ${user.fullName}\n`;
        textContent += `   Mobile: ${user.mobileNumber}\n`;
        textContent += `   Email: ${user.email}\n`;
        textContent += `   Hospital: ${hospital?.name || 'N/A'}\n`;
        textContent += `   Hospital ID: ${hospital?.id || 'N/A'}\n\n`;
      });
    }

    // Doctors
    if (allDoctors.length > 0) {
      textContent += '\nDOCTORS\n';
      textContent += '-'.repeat(60) + '\n';
      allDoctors.forEach((doctor, idx) => {
        const user = allUsers.find(u => u.id === doctor.userId);
        const hospital = allHospitals.find(h => h.id === doctor.hospitalId);
        textContent += `${idx + 1}. ${user?.fullName || 'Unknown'}\n`;
        textContent += `   Mobile: ${user?.mobileNumber || 'N/A'}\n`;
        textContent += `   Email: ${user?.email || 'N/A'}\n`;
        textContent += `   Specialty: ${doctor.specialty || 'N/A'}\n`;
        textContent += `   Hospital: ${hospital?.name || 'N/A'}\n`;
        textContent += `   License: ${doctor.licenseNumber || 'N/A'}\n`;
        textContent += `   Experience: ${doctor.experience || 0} years\n`;
        textContent += `   Fee: ₹${doctor.consultationFee || 'N/A'}\n\n`;
      });
    }

    // Receptionists
    if (allReceptionists.length > 0) {
      textContent += '\nRECEPTIONISTS\n';
      textContent += '-'.repeat(60) + '\n';
      allReceptionists.forEach((receptionist, idx) => {
        const user = allUsers.find(u => u.id === receptionist.userId);
        const hospital = allHospitals.find(h => h.id === receptionist.hospitalId);
        textContent += `${idx + 1}. ${user?.fullName || 'Unknown'}\n`;
        textContent += `   Mobile: ${user?.mobileNumber || 'N/A'}\n`;
        textContent += `   Email: ${user?.email || 'N/A'}\n`;
        textContent += `   Hospital: ${hospital?.name || 'N/A'}\n`;
        textContent += `   Employee ID: ${receptionist.employeeId || 'N/A'}\n`;
        textContent += `   Department: ${receptionist.department || 'N/A'}\n\n`;
      });
    }

    // Hospitals
    if (allHospitals.length > 0) {
      textContent += '\nHOSPITALS\n';
      textContent += '-'.repeat(60) + '\n';
      allHospitals.forEach((hospital, idx) => {
        const user = allUsers.find(u => u.id === hospital.userId);
        textContent += `${idx + 1}. ${hospital.name}\n`;
        textContent += `   ID: ${hospital.id}\n`;
        textContent += `   Admin: ${user?.fullName || 'N/A'} (${user?.mobileNumber || 'N/A'})\n`;
        textContent += `   Address: ${hospital.address || 'N/A'}\n`;
        textContent += `   City: ${hospital.city || 'N/A'}, ${hospital.state || 'N/A'}\n`;
        textContent += `   Beds: ${hospital.totalBeds || 'N/A'}\n`;
        textContent += `   Established: ${hospital.establishedYear || 'N/A'}\n`;
        textContent += `   Emergency: ${hospital.emergencyServices ? 'Yes' : 'No'}\n\n`;
      });
    }

    // Patients (sample - first 20)
    if (allPatients.length > 0) {
      textContent += '\nPATIENTS (Sample - First 20)\n';
      textContent += '-'.repeat(60) + '\n';
      allPatients.slice(0, 20).forEach((patient, idx) => {
        const user = allUsers.find(u => u.id === patient.userId);
        textContent += `${idx + 1}. ${user?.fullName || 'Unknown'}\n`;
        textContent += `   Mobile: ${user?.mobileNumber || 'N/A'}\n`;
        textContent += `   Email: ${user?.email || 'N/A'}\n`;
        textContent += `   Gender: ${patient.gender || 'N/A'}\n`;
        textContent += `   City: ${patient.city || 'N/A'}\n`;
        textContent += `   Blood Group: ${patient.bloodGroup || 'N/A'}\n\n`;
      });
      if (allPatients.length > 20) {
        textContent += `... and ${allPatients.length - 20} more patients\n\n`;
      }
    }

    // Labs
    if (allLabs.length > 0) {
      textContent += '\nLABS\n';
      textContent += '-'.repeat(60) + '\n';
      allLabs.forEach((lab, idx) => {
        const user = allUsers.find(u => u.id === lab.userId);
        textContent += `${idx + 1}. ${lab.name || 'Unknown Lab'}\n`;
        textContent += `   Admin: ${user?.fullName || 'N/A'} (${user?.mobileNumber || 'N/A'})\n`;
        textContent += `   Address: ${lab.address || 'N/A'}\n`;
        textContent += `   City: ${lab.city || 'N/A'}\n\n`;
      });
    }

    // Save text file
    const textPath = './test-data-export.txt';
    await fs.writeFile(textPath, textContent);
    console.log(`✅ Exported to Text: ${textPath}`);

    console.log('\n📄 To convert to PDF, you can:');
    console.log('   1. Open the text file and print to PDF');
    console.log('   2. Use online converters');
    console.log('   3. Use pandoc: pandoc test-data-export.txt -o test-data-export.pdf');

    return testData;
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    throw error;
  }
}

exportTestData().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

