import { db } from '../server/db';
import { 
  users, 
  hospitals, 
  doctors, 
  patients, 
  receptionists, 
  labs,
  appointments,
  prescriptions,
  notifications,
  states,
  cities,
  otpVerifications,
  labReports
} from '../shared/schema';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function deleteAllData() {
  try {
    console.log('🗑️  DELETING ALL DATA FROM NEXACARE MEDICAL SYSTEM');
    console.log('=' .repeat(60));
    
    // Delete all data from all tables
    console.log('\n📋 DELETING DATABASE RECORDS:');
    
    // Delete in reverse order of dependencies
    await db.delete(notifications);
    console.log('✅ Deleted all notifications');
    
    await db.delete(labReports);
    console.log('✅ Deleted all lab reports');
    
    await db.delete(prescriptions);
    console.log('✅ Deleted all prescriptions');
    
    await db.delete(appointments);
    console.log('✅ Deleted all appointments');
    
    await db.delete(otpVerifications);
    console.log('✅ Deleted all OTP verifications');
    
    await db.delete(doctors);
    console.log('✅ Deleted all doctors');
    
    await db.delete(patients);
    console.log('✅ Deleted all patients');
    
    await db.delete(receptionists);
    console.log('✅ Deleted all receptionists');
    
    await db.delete(labs);
    console.log('✅ Deleted all labs');
    
    await db.delete(hospitals);
    console.log('✅ Deleted all hospitals');
    
    await db.delete(users);
    console.log('✅ Deleted all users');
    
    await db.delete(cities);
    console.log('✅ Deleted all cities');
    
    await db.delete(states);
    console.log('✅ Deleted all states');
    
    // Reset auto-increment sequences
    console.log('\n🔄 RESETTING AUTO-INCREMENT SEQUENCES:');
    await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE hospitals_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE doctors_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE patients_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE receptionists_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE labs_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE appointments_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE prescriptions_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE notifications_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE states_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE cities_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE otp_verifications_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE lab_reports_id_seq RESTART WITH 1`);
    console.log('✅ Reset all auto-increment sequences');
    
    console.log('\n🗂️  DELETING DATA FILES:');
    
    // Delete JSON data files
    const dataFiles = [
      'scripts/data/users.json',
      'scripts/data/hospitals.json',
      'scripts/data/doctors.json',
      'scripts/data/patients.json',
      'scripts/data/receptionists.json',
      'scripts/data/labs.json',
      'scripts/data/appointments.json',
      'scripts/data/prescriptions.json',
      'scripts/data/notifications.json',
      'scripts/data/otp_verifications.json',
      'scripts/data/lab_reports.json'
    ];
    
    for (const file of dataFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted ${file}`);
      }
    }
    
    // Delete dummy data file
    const dummyDataPath = path.join(process.cwd(), 'dummy-data.json');
    if (fs.existsSync(dummyDataPath)) {
      fs.unlinkSync(dummyDataPath);
      console.log('✅ Deleted dummy-data.json');
    }
    
    console.log('\n🗑️  DELETING SEED SCRIPTS:');
    
    // Delete seed scripts
    const seedScripts = [
      'scripts/seed-data.ts',
      'scripts/seed-comprehensive-data.ts',
      'scripts/seed-maharashtra-data.ts',
      'scripts/seed-cities.ts',
      'scripts/simple-seed.ts',
      'scripts/run-seed.ts',
      'scripts/show-database-tables.ts',
      'scripts/database-overview.ts',
      'scripts/delete-all-data.ts'
    ];
    
    for (const script of seedScripts) {
      const scriptPath = path.join(process.cwd(), script);
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
        console.log(`✅ Deleted ${script}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL DATA DELETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('✅ Database tables cleared');
    console.log('✅ Auto-increment sequences reset');
    console.log('✅ Data files deleted');
    console.log('✅ Seed scripts deleted');
    console.log('\n🚀 Ready for fresh data!');
    
  } catch (error) {
    console.error('❌ Error deleting data:', error);
  } finally {
    process.exit(0);
  }
}

deleteAllData();



