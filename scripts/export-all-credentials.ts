// Script to export ALL user credentials from database
import { db } from '../server/db';
import { users, hospitals, doctors, patients, receptionists, labs } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';

const UNIVERSAL_PASSWORD = 'password123';

async function exportAllCredentials() {
  try {
    console.log('📊 Exporting ALL user credentials from database...\n');

    // Get all users
    console.log('🔍 Fetching all users...');
    const allUsers = await db.select().from(users);
    console.log(`✅ Found ${allUsers.length} users\n`);

    // Get related data
    console.log('🔍 Fetching related data...');
    const allHospitals = await db.select().from(hospitals);
    const allDoctors = await db.select().from(doctors);
    const allPatients = await db.select().from(patients);
    const allReceptionists = await db.select().from(receptionists);
    const allLabs = await db.select().from(labs);
    console.log(`✅ Fetched all related data\n`);

    // Organize users by role
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

    // Build credentials list
    let credentialsContent = '# NEXACARE MEDICAL SYSTEM - COMPLETE USER CREDENTIALS\n';
    credentialsContent += '='.repeat(80) + '\n\n';
    credentialsContent += `Export Date: ${new Date().toLocaleString()}\n`;
    credentialsContent += `Total Users: ${allUsers.length}\n`;
    credentialsContent += `Universal Password: ${UNIVERSAL_PASSWORD}\n\n`;
    credentialsContent += '='.repeat(80) + '\n\n';

    // Summary
    credentialsContent += '## SUMMARY\n\n';
    credentialsContent += `- **ADMIN**: ${usersByRole.ADMIN.length} user(s)\n`;
    credentialsContent += `- **HOSPITAL**: ${usersByRole.HOSPITAL.length} user(s)\n`;
    credentialsContent += `- **DOCTOR**: ${usersByRole.DOCTOR.length} user(s)\n`;
    credentialsContent += `- **PATIENT**: ${usersByRole.PATIENT.length} user(s)\n`;
    credentialsContent += `- **RECEPTIONIST**: ${usersByRole.RECEPTIONIST.length} user(s)\n`;
    credentialsContent += `- **LAB**: ${usersByRole.LAB.length} user(s)\n\n`;
    credentialsContent += '---\n\n';

    // ADMIN USERS
    if (usersByRole.ADMIN.length > 0) {
      credentialsContent += '## 👑 ADMIN USERS\n\n';
      credentialsContent += '| # | Mobile Number | Full Name | Email | Verified |\n';
      credentialsContent += '|---|---------------|-----------|-------|----------|\n';
      usersByRole.ADMIN.forEach((user, idx) => {
        credentialsContent += `| ${idx + 1} | \`${user.mobileNumber}\` | ${user.fullName} | ${user.email} | ${user.isVerified ? 'Yes' : 'No'} |\n`;
      });
      credentialsContent += '\n**Password for all users:** `' + UNIVERSAL_PASSWORD + '`\n\n';
      credentialsContent += '---\n\n';
    }

    // HOSPITAL ADMIN USERS
    if (usersByRole.HOSPITAL.length > 0) {
      credentialsContent += '## 🏥 HOSPITAL ADMIN USERS\n\n';
      credentialsContent += '| # | Mobile Number | Full Name | Hospital Name | City | Email |\n';
      credentialsContent += '|---|---------------|-----------|---------------|------|-------|\n';
      usersByRole.HOSPITAL.forEach((user, idx) => {
        const hospital = allHospitals.find(h => h.userId === user.id);
        credentialsContent += `| ${idx + 1} | \`${user.mobileNumber}\` | ${user.fullName} | ${hospital?.name || 'N/A'} | ${hospital?.city || 'N/A'} | ${user.email} |\n`;
      });
      credentialsContent += '\n**Password for all users:** `' + UNIVERSAL_PASSWORD + '`\n\n';
      credentialsContent += '---\n\n';
    }

    // DOCTOR USERS
    if (usersByRole.DOCTOR.length > 0) {
      credentialsContent += '## 👨‍⚕️ DOCTOR USERS\n\n';
      credentialsContent += '| # | Mobile Number | Doctor Name | Specialty | Hospital | City | Email |\n';
      credentialsContent += '|---|---------------|-------------|-----------|----------|------|-------|\n';
      usersByRole.DOCTOR.forEach((user, idx) => {
        const doctor = allDoctors.find(d => d.userId === user.id);
        const hospital = doctor ? allHospitals.find(h => h.id === doctor.hospitalId) : null;
        credentialsContent += `| ${idx + 1} | \`${user.mobileNumber}\` | ${user.fullName} | ${doctor?.specialty || 'N/A'} | ${hospital?.name || 'N/A'} | ${hospital?.city || 'N/A'} | ${user.email} |\n`;
      });
      credentialsContent += '\n**Password for all users:** `' + UNIVERSAL_PASSWORD + '`\n\n';
      credentialsContent += '---\n\n';
    }

    // PATIENT USERS
    if (usersByRole.PATIENT.length > 0) {
      credentialsContent += '## 👤 PATIENT USERS\n\n';
      credentialsContent += '| # | Mobile Number | Patient Name | Age | Gender | City | Blood Group | Email |\n';
      credentialsContent += '|---|---------------|--------------|-----|--------|------|-------------|-------|\n';
      usersByRole.PATIENT.forEach((user, idx) => {
        const patient = allPatients.find(p => p.userId === user.id);
        const age = patient?.dateOfBirth 
          ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : 'N/A';
        credentialsContent += `| ${idx + 1} | \`${user.mobileNumber}\` | ${user.fullName} | ${age} | ${patient?.gender || 'N/A'} | ${patient?.city || 'N/A'} | ${patient?.bloodGroup || 'N/A'} | ${user.email} |\n`;
      });
      credentialsContent += '\n**Password for all users:** `' + UNIVERSAL_PASSWORD + '`\n\n';
      credentialsContent += '---\n\n';
    }

    // RECEPTIONIST USERS
    if (usersByRole.RECEPTIONIST.length > 0) {
      credentialsContent += '## 📞 RECEPTIONIST USERS\n\n';
      credentialsContent += '| # | Mobile Number | Receptionist Name | Hospital | Shift | Email |\n';
      credentialsContent += '|---|---------------|-------------------|----------|-------|-------|\n';
      usersByRole.RECEPTIONIST.forEach((user, idx) => {
        const receptionist = allReceptionists.find(r => r.userId === user.id);
        const hospital = receptionist ? allHospitals.find(h => h.id === receptionist.hospitalId) : null;
        credentialsContent += `| ${idx + 1} | \`${user.mobileNumber}\` | ${user.fullName} | ${hospital?.name || 'N/A'} | ${receptionist?.shift || 'N/A'} | ${user.email} |\n`;
      });
      credentialsContent += '\n**Password for all users:** `' + UNIVERSAL_PASSWORD + '`\n\n';
      credentialsContent += '---\n\n';
    }

    // LAB USERS
    if (usersByRole.LAB.length > 0) {
      credentialsContent += '## 🧪 LAB USERS\n\n';
      credentialsContent += '| # | Mobile Number | Lab Admin Name | Lab Name | City | Email |\n';
      credentialsContent += '|---|---------------|----------------|----------|------|-------|\n';
      usersByRole.LAB.forEach((user, idx) => {
        const lab = allLabs.find(l => l.userId === user.id);
        credentialsContent += `| ${idx + 1} | \`${user.mobileNumber}\` | ${user.fullName} | ${lab?.name || 'N/A'} | ${lab?.city || 'N/A'} | ${user.email} |\n`;
      });
      credentialsContent += '\n**Password for all users:** `' + UNIVERSAL_PASSWORD + '`\n\n';
      credentialsContent += '---\n\n';
    }

    // CSV Format (for easy import)
    credentialsContent += '## 📋 CSV FORMAT (All Users)\n\n';
    credentialsContent += '```csv\n';
    credentialsContent += 'Role,Mobile Number,Full Name,Email,Additional Info\n';
    
    // Add all users to CSV
    usersByRole.ADMIN.forEach(user => {
      credentialsContent += `ADMIN,${user.mobileNumber},${user.fullName},${user.email},System Administrator\n`;
    });
    
    usersByRole.HOSPITAL.forEach(user => {
      const hospital = allHospitals.find(h => h.userId === user.id);
      credentialsContent += `HOSPITAL,${user.mobileNumber},${user.fullName},${user.email},${hospital?.name || 'N/A'}\n`;
    });
    
    usersByRole.DOCTOR.forEach(user => {
      const doctor = allDoctors.find(d => d.userId === user.id);
      const hospital = doctor ? allHospitals.find(h => h.id === doctor.hospitalId) : null;
      credentialsContent += `DOCTOR,${user.mobileNumber},${user.fullName},${user.email},${doctor?.specialty || 'N/A'} - ${hospital?.name || 'N/A'}\n`;
    });
    
    usersByRole.PATIENT.forEach(user => {
      const patient = allPatients.find(p => p.userId === user.id);
      credentialsContent += `PATIENT,${user.mobileNumber},${user.fullName},${user.email},${patient?.city || 'N/A'}\n`;
    });
    
    usersByRole.RECEPTIONIST.forEach(user => {
      const receptionist = allReceptionists.find(r => r.userId === user.id);
      const hospital = receptionist ? allHospitals.find(h => h.id === receptionist.hospitalId) : null;
      credentialsContent += `RECEPTIONIST,${user.mobileNumber},${user.fullName},${user.email},${hospital?.name || 'N/A'}\n`;
    });
    
    usersByRole.LAB.forEach(user => {
      const lab = allLabs.find(l => l.userId === user.id);
      credentialsContent += `LAB,${user.mobileNumber},${user.fullName},${user.email},${lab?.name || 'N/A'}\n`;
    });
    
    credentialsContent += '```\n\n';
    credentialsContent += '---\n\n';

    // Simple list format
    credentialsContent += '## 📝 SIMPLE LIST FORMAT (Mobile Number | Password)\n\n';
    credentialsContent += '```\n';
    credentialsContent += 'ALL USERS USE PASSWORD: ' + UNIVERSAL_PASSWORD + '\n\n';
    
    usersByRole.ADMIN.forEach(user => {
      credentialsContent += `${user.mobileNumber} | ${UNIVERSAL_PASSWORD} | ADMIN | ${user.fullName}\n`;
    });
    
    usersByRole.HOSPITAL.forEach(user => {
      credentialsContent += `${user.mobileNumber} | ${UNIVERSAL_PASSWORD} | HOSPITAL | ${user.fullName}\n`;
    });
    
    usersByRole.DOCTOR.forEach(user => {
      credentialsContent += `${user.mobileNumber} | ${UNIVERSAL_PASSWORD} | DOCTOR | ${user.fullName}\n`;
    });
    
    usersByRole.PATIENT.forEach(user => {
      credentialsContent += `${user.mobileNumber} | ${UNIVERSAL_PASSWORD} | PATIENT | ${user.fullName}\n`;
    });
    
    usersByRole.RECEPTIONIST.forEach(user => {
      credentialsContent += `${user.mobileNumber} | ${UNIVERSAL_PASSWORD} | RECEPTIONIST | ${user.fullName}\n`;
    });
    
    usersByRole.LAB.forEach(user => {
      credentialsContent += `${user.mobileNumber} | ${UNIVERSAL_PASSWORD} | LAB | ${user.fullName}\n`;
    });
    
    credentialsContent += '```\n\n';

    // Save to file
    const filePath = './ALL_USER_CREDENTIALS.md';
    await fs.writeFile(filePath, credentialsContent);
    console.log(`✅ Exported all credentials to: ${filePath}\n`);

    // Also save as JSON
    const jsonData = {
      exportDate: new Date().toISOString(),
      universalPassword: UNIVERSAL_PASSWORD,
      summary: {
        totalUsers: allUsers.length,
        byRole: {
          ADMIN: usersByRole.ADMIN.length,
          HOSPITAL: usersByRole.HOSPITAL.length,
          DOCTOR: usersByRole.DOCTOR.length,
          PATIENT: usersByRole.PATIENT.length,
          RECEPTIONIST: usersByRole.RECEPTIONIST.length,
          LAB: usersByRole.LAB.length,
        }
      },
      credentials: {
        admin: usersByRole.ADMIN.map(u => ({
          mobileNumber: u.mobileNumber,
          fullName: u.fullName,
          email: u.email,
          password: UNIVERSAL_PASSWORD,
        })),
        hospitals: usersByRole.HOSPITAL.map(u => {
          const hospital = allHospitals.find(h => h.userId === u.id);
          return {
            mobileNumber: u.mobileNumber,
            fullName: u.fullName,
            email: u.email,
            password: UNIVERSAL_PASSWORD,
            hospitalName: hospital?.name || 'N/A',
            city: hospital?.city || 'N/A',
          };
        }),
        doctors: usersByRole.DOCTOR.map(u => {
          const doctor = allDoctors.find(d => d.userId === u.id);
          const hospital = doctor ? allHospitals.find(h => h.id === doctor.hospitalId) : null;
          return {
            mobileNumber: u.mobileNumber,
            fullName: u.fullName,
            email: u.email,
            password: UNIVERSAL_PASSWORD,
            specialty: doctor?.specialty || 'N/A',
            hospitalName: hospital?.name || 'N/A',
            city: hospital?.city || 'N/A',
          };
        }),
        patients: usersByRole.PATIENT.map(u => {
          const patient = allPatients.find(p => p.userId === u.id);
          return {
            mobileNumber: u.mobileNumber,
            fullName: u.fullName,
            email: u.email,
            password: UNIVERSAL_PASSWORD,
            gender: patient?.gender || 'N/A',
            city: patient?.city || 'N/A',
            bloodGroup: patient?.bloodGroup || 'N/A',
          };
        }),
        receptionists: usersByRole.RECEPTIONIST.map(u => {
          const receptionist = allReceptionists.find(r => r.userId === u.id);
          const hospital = receptionist ? allHospitals.find(h => h.id === receptionist.hospitalId) : null;
          return {
            mobileNumber: u.mobileNumber,
            fullName: u.fullName,
            email: u.email,
            password: UNIVERSAL_PASSWORD,
            hospitalName: hospital?.name || 'N/A',
            shift: receptionist?.shift || 'N/A',
          };
        }),
        labs: usersByRole.LAB.map(u => {
          const lab = allLabs.find(l => l.userId === u.id);
          return {
            mobileNumber: u.mobileNumber,
            fullName: u.fullName,
            email: u.email,
            password: UNIVERSAL_PASSWORD,
            labName: lab?.name || 'N/A',
            city: lab?.city || 'N/A',
          };
        }),
      }
    };

    const jsonPath = './ALL_USER_CREDENTIALS.json';
    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log(`✅ Exported JSON format to: ${jsonPath}\n`);

    // Print summary
    console.log('📊 EXPORT SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${allUsers.length}`);
    console.log(`  - ADMIN: ${usersByRole.ADMIN.length}`);
    console.log(`  - HOSPITAL: ${usersByRole.HOSPITAL.length}`);
    console.log(`  - DOCTOR: ${usersByRole.DOCTOR.length}`);
    console.log(`  - PATIENT: ${usersByRole.PATIENT.length}`);
    console.log(`  - RECEPTIONIST: ${usersByRole.RECEPTIONIST.length}`);
    console.log(`  - LAB: ${usersByRole.LAB.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✅ All credentials exported successfully!`);
    console.log(`   - Markdown: ${filePath}`);
    console.log(`   - JSON: ${jsonPath}`);

  } catch (error) {
    console.error('❌ Error exporting credentials:', error);
    throw error;
  }
}

exportAllCredentials().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});






