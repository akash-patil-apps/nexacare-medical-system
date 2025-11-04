// Script to check appointment data and receptionist-hospital associations
import { db } from '../server/db';
import { users, appointments, receptionists, hospitals, doctors, patients } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function checkAppointmentData() {
  try {
    console.log('🔍 Checking appointment data and associations...\n');

    // 1. Find Neha Mehta (receptionist)
    const nehaMehta = await db.select().from(users)
      .where(eq(users.fullName, 'Neha Mehta'))
      .limit(1);

    if (nehaMehta.length === 0) {
      console.log('❌ Neha Mehta (receptionist) not found');
      return;
    }

    console.log('✅ Found Neha Mehta (receptionist):');
    console.log('   User ID:', nehaMehta[0].id);
    console.log('   Role:', nehaMehta[0].role);
    console.log('   Mobile:', nehaMehta[0].mobileNumber);

    // 2. Find her receptionist record
    const receptionistRecord = await db.select().from(receptionists)
      .where(eq(receptionists.userId, nehaMehta[0].id))
      .limit(1);

    if (receptionistRecord.length === 0) {
      console.log('❌ Receptionist record not found for Neha Mehta');
      return;
    }

    console.log('\n✅ Receptionist record:');
    console.log('   Receptionist ID:', receptionistRecord[0].id);
    console.log('   Hospital ID:', receptionistRecord[0].hospitalId);

    // 3. Find the hospital name
    const hospital = await db.select().from(hospitals)
      .where(eq(hospitals.id, receptionistRecord[0].hospitalId))
      .limit(1);

    if (hospital.length > 0) {
      console.log('   Hospital Name:', hospital[0].name);
    }

    // 4. Find Apollo Hospital
    const apolloHospital = await db.select().from(hospitals)
      .where(eq(hospitals.name, 'Apollo Hospitals Mumbai'))
      .limit(1);

    if (apolloHospital.length > 0) {
      console.log('\n✅ Apollo Hospitals Mumbai:');
      console.log('   Hospital ID:', apolloHospital[0].id);
      console.log('   Name:', apolloHospital[0].name);
    }

    // 5. Find Dr. Lakshmi Verma
    const drLakshmi = await db.select()
      .from(users)
      .where(eq(users.fullName, 'Dr. Lakshmi Verma'))
      .limit(1);

    if (drLakshmi.length > 0) {
      console.log('\n✅ Found Dr. Lakshmi Verma:');
      console.log('   User ID:', drLakshmi[0].id);

      const doctorRecord = await db.select().from(doctors)
        .where(eq(doctors.userId, drLakshmi[0].id))
        .limit(1);

      if (doctorRecord.length > 0) {
        console.log('   Doctor ID:', doctorRecord[0].id);
        console.log('   Hospital ID:', doctorRecord[0].hospitalId);
      }
    }

    // 6. Find all appointments for Apollo Hospital
    if (apolloHospital.length > 0) {
      const apolloAppointments = await db.select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        hospitalId: appointments.hospitalId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        patientName: users.fullName,
        doctorName: users.fullName
      })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(users, eq(patients.userId, users.id))
        .where(eq(appointments.hospitalId, apolloHospital[0].id))
        .limit(10);

      console.log('\n📋 Appointments for Apollo Hospital:');
      console.log(`   Total: ${apolloAppointments.length} appointments`);
      apolloAppointments.forEach((apt, index) => {
        console.log(`\n   Appointment ${index + 1}:`);
        console.log('     ID:', apt.id);
        console.log('     Patient:', apt.patientName);
        console.log('     Doctor ID:', apt.doctorId);
        console.log('     Hospital ID:', apt.hospitalId);
        console.log('     Date:', apt.appointmentDate);
        console.log('     Time:', apt.appointmentTime);
        console.log('     Status:', apt.status);
      });
    }

    // 7. Check if Neha Mehta's hospital matches Apollo
    if (receptionistRecord.length > 0 && apolloHospital.length > 0) {
      if (receptionistRecord[0].hospitalId === apolloHospital[0].id) {
        console.log('\n✅ MATCH: Neha Mehta is associated with Apollo Hospital');
      } else {
        console.log('\n❌ MISMATCH: Neha Mehta is NOT associated with Apollo Hospital');
        console.log('   Neha Mehta Hospital ID:', receptionistRecord[0].hospitalId);
        console.log('   Apollo Hospital ID:', apolloHospital[0].id);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAppointmentData().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

