// Script to export all test data from database to PDF
import PDFDocument from 'pdfkit';
import { db } from '../server/db';
import { users, hospitals, doctors, patients, receptionists, labs } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function exportToPDF() {
  try {
    console.log('📊 Exporting test data to PDF...\n');

    // Fetch all data
    const allUsers = await db.select().from(users);
    const allHospitals = await db.select().from(hospitals);
    const allDoctors = await db.select().from(doctors);
    const allPatients = await db.select().from(patients);
    const allReceptionists = await db.select().from(receptionists);
    const allLabs = await db.select().from(labs);

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

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const outputPath = path.join(process.cwd(), 'test-data-export.pdf');
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('NEXACARE MEDICAL SYSTEM', { align: 'center' });
    doc.fontSize(16).font('Helvetica').text('Test Data Export', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Export Date: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).font('Helvetica-Bold').text('SUMMARY', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Total Users: ${allUsers.length}`);
    doc.text(`  - ADMIN: ${usersByRole.ADMIN.length}`);
    doc.text(`  - HOSPITAL: ${usersByRole.HOSPITAL.length}`);
    doc.text(`  - DOCTOR: ${usersByRole.DOCTOR.length}`);
    doc.text(`  - PATIENT: ${usersByRole.PATIENT.length}`);
    doc.text(`  - RECEPTIONIST: ${usersByRole.RECEPTIONIST.length}`);
    doc.text(`  - LAB: ${usersByRole.LAB.length}`);
    doc.text(`Total Hospitals: ${allHospitals.length}`);
    doc.text(`Total Doctors: ${allDoctors.length}`);
    doc.text(`Total Patients: ${allPatients.length}`);
    doc.text(`Total Receptionists: ${allReceptionists.length}`);
    doc.text(`Total Labs: ${allLabs.length}`);
    doc.moveDown(2);

    // Add new page if needed
    if (usersByRole.ADMIN.length > 0 || usersByRole.HOSPITAL.length > 0) {
      doc.addPage();
    }

    // Admin Users
    if (usersByRole.ADMIN.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('ADMIN USERS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      usersByRole.ADMIN.forEach((user, idx) => {
        doc.text(`${idx + 1}. ${user.fullName}`, { continued: false });
        doc.text(`   Mobile: ${user.mobileNumber}`, { indent: 20 });
        doc.text(`   Email: ${user.email}`, { indent: 20 });
        doc.text(`   Role: ${user.role}`, { indent: 20 });
        doc.text(`   Verified: ${user.isVerified ? 'Yes' : 'No'}`, { indent: 20 });
        doc.moveDown(0.5);
      });
      doc.moveDown();
    }

    // Hospital Admin Users
    if (usersByRole.HOSPITAL.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('HOSPITAL ADMIN USERS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      usersByRole.HOSPITAL.forEach((user, idx) => {
        const hospital = allHospitals.find(h => h.userId === user.id);
        doc.text(`${idx + 1}. ${user.fullName}`, { continued: false });
        doc.text(`   Mobile: ${user.mobileNumber}`, { indent: 20 });
        doc.text(`   Email: ${user.email}`, { indent: 20 });
        doc.text(`   Hospital: ${hospital?.name || 'N/A'}`, { indent: 20 });
        doc.text(`   Hospital ID: ${hospital?.id || 'N/A'}`, { indent: 20 });
        doc.moveDown(0.5);
      });
      doc.moveDown();
    }

    // Hospitals
    if (allHospitals.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('HOSPITALS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      allHospitals.forEach((hospital, idx) => {
        const user = allUsers.find(u => u.id === hospital.userId);
        doc.text(`${idx + 1}. ${hospital.name}`, { continued: false });
        doc.text(`   ID: ${hospital.id}`, { indent: 20 });
        doc.text(`   Admin: ${user?.fullName || 'N/A'} (${user?.mobileNumber || 'N/A'})`, { indent: 20 });
        doc.text(`   Address: ${hospital.address || 'N/A'}`, { indent: 20 });
        doc.text(`   City: ${hospital.city || 'N/A'}, ${hospital.state || 'N/A'}`, { indent: 20 });
        doc.text(`   Beds: ${hospital.totalBeds || 'N/A'}`, { indent: 20 });
        doc.text(`   Established: ${hospital.establishedYear || 'N/A'}`, { indent: 20 });
        doc.text(`   Emergency: ${hospital.emergencyServices ? 'Yes' : 'No'}`, { indent: 20 });
        doc.moveDown(0.5);
      });
      doc.moveDown();
    }

    // Doctors
    if (allDoctors.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('DOCTORS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      allDoctors.forEach((doctor, idx) => {
        const user = allUsers.find(u => u.id === doctor.userId);
        const hospital = allHospitals.find(h => h.id === doctor.hospitalId);
        doc.text(`${idx + 1}. ${user?.fullName || 'Unknown'}`, { continued: false });
        doc.text(`   Mobile: ${user?.mobileNumber || 'N/A'}`, { indent: 20 });
        doc.text(`   Email: ${user?.email || 'N/A'}`, { indent: 20 });
        doc.text(`   Specialty: ${doctor.specialty || 'N/A'}`, { indent: 20 });
        doc.text(`   Hospital: ${hospital?.name || 'N/A'}`, { indent: 20 });
        doc.text(`   License: ${doctor.licenseNumber || 'N/A'}`, { indent: 20 });
        doc.text(`   Experience: ${doctor.experience || 0} years`, { indent: 20 });
        doc.text(`   Fee: ₹${doctor.consultationFee || 'N/A'}`, { indent: 20 });
        doc.moveDown(0.5);
      });
      doc.moveDown();
    }

    // Receptionists
    if (allReceptionists.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('RECEPTIONISTS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      allReceptionists.forEach((receptionist, idx) => {
        const user = allUsers.find(u => u.id === receptionist.userId);
        const hospital = allHospitals.find(h => h.id === receptionist.hospitalId);
        doc.text(`${idx + 1}. ${user?.fullName || 'Unknown'}`, { continued: false });
        doc.text(`   Mobile: ${user?.mobileNumber || 'N/A'}`, { indent: 20 });
        doc.text(`   Email: ${user?.email || 'N/A'}`, { indent: 20 });
        doc.text(`   Hospital: ${hospital?.name || 'N/A'}`, { indent: 20 });
        doc.text(`   Employee ID: ${receptionist.employeeId || 'N/A'}`, { indent: 20 });
        doc.text(`   Department: ${receptionist.department || 'N/A'}`, { indent: 20 });
        doc.moveDown(0.5);
      });
      doc.moveDown();
    }

    // Patients
    if (allPatients.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('PATIENTS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      allPatients.slice(0, 50).forEach((patient, idx) => {
        const user = allUsers.find(u => u.id === patient.userId);
        doc.text(`${idx + 1}. ${user?.fullName || 'Unknown'}`, { continued: false });
        doc.text(`   Mobile: ${user?.mobileNumber || 'N/A'}`, { indent: 20 });
        doc.text(`   Email: ${user?.email || 'N/A'}`, { indent: 20 });
        doc.text(`   Gender: ${patient.gender || 'N/A'}`, { indent: 20 });
        doc.text(`   City: ${patient.city || 'N/A'}`, { indent: 20 });
        doc.text(`   Blood Group: ${patient.bloodGroup || 'N/A'}`, { indent: 20 });
        doc.moveDown(0.5);
      });
      if (allPatients.length > 50) {
        doc.text(`... and ${allPatients.length - 50} more patients`);
      }
      doc.moveDown();
    }

    // Labs
    if (allLabs.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('LABS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica');
      allLabs.forEach((lab, idx) => {
        const user = allUsers.find(u => u.id === lab.userId);
        doc.text(`${idx + 1}. ${lab.name || 'Unknown Lab'}`, { continued: false });
        doc.text(`   Admin: ${user?.fullName || 'N/A'} (${user?.mobileNumber || 'N/A'})`, { indent: 20 });
        doc.text(`   Address: ${lab.address || 'N/A'}`, { indent: 20 });
        doc.text(`   City: ${lab.city || 'N/A'}`, { indent: 20 });
        doc.moveDown(0.5);
      });
    }

    // Footer on last page
    doc.fontSize(8).text(
      `Generated on ${new Date().toLocaleString()} | NexaCare Medical System`,
      { align: 'center' }
    );

    // Finalize PDF
    doc.end();

    console.log('\n📋 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${allUsers.length}`);
    console.log(`  - ADMIN: ${usersByRole.ADMIN.length}`);
    console.log(`  - HOSPITAL: ${usersByRole.HOSPITAL.length}`);
    console.log(`  - DOCTOR: ${usersByRole.DOCTOR.length}`);
    console.log(`  - PATIENT: ${usersByRole.PATIENT.length}`);
    console.log(`  - RECEPTIONIST: ${usersByRole.RECEPTIONIST.length}`);
    console.log(`  - LAB: ${usersByRole.LAB.length}`);
    console.log(`Total Hospitals: ${allHospitals.length}`);
    console.log(`Total Doctors: ${allDoctors.length}`);
    console.log(`Total Patients: ${allPatients.length}`);
    console.log(`Total Receptionists: ${allReceptionists.length}`);
    console.log(`Total Labs: ${allLabs.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log(`✅ PDF exported successfully: ${outputPath}`);
        resolve(outputPath);
      });
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Error exporting to PDF:', error);
    throw error;
  }
}

exportToPDF().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

