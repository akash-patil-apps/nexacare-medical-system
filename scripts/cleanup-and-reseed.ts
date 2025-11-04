// Script to delete all data and reseed with correct 10-digit mobile numbers
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
  labReports,
  otpVerifications
} from '../shared/schema';
import { sql } from 'drizzle-orm';

async function cleanupAndReseed() {
  try {
    console.log('🗑️  Cleaning up database...\n');

    // Delete all data in reverse order of dependencies
    await db.delete(notifications);
    await db.delete(labReports);
    await db.delete(prescriptions);
    await db.delete(appointments);
    await db.delete(otpVerifications);
    await db.delete(doctors);
    await db.delete(patients);
    await db.delete(receptionists);
    await db.delete(labs);
    await db.delete(hospitals);
    await db.delete(users);

    console.log('✅ All data deleted\n');

    // Reset sequences
    await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE hospitals_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE doctors_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE patients_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE receptionists_id_seq RESTART WITH 1`);
    await db.execute(sql`ALTER SEQUENCE labs_id_seq RESTART WITH 1`);

    console.log('✅ Sequences reset\n');
    console.log('🎉 Database cleaned. Now run: npm run seed\n');

  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    throw error;
  }
}

cleanupAndReseed().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

