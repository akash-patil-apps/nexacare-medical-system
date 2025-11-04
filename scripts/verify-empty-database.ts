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
  cities
} from '../shared/schema';
import { count } from 'drizzle-orm';

async function verifyEmptyDatabase() {
  try {
    console.log('🔍 VERIFYING EMPTY DATABASE');
    console.log('=' .repeat(40));
    
    // Check counts for all tables
    const [
      userCount,
      hospitalCount, 
      doctorCount,
      patientCount,
      receptionistCount,
      labCount,
      appointmentCount,
      prescriptionCount,
      notificationCount,
      stateCount,
      cityCount
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(hospitals),
      db.select({ count: count() }).from(doctors),
      db.select({ count: count() }).from(patients),
      db.select({ count: count() }).from(receptionists),
      db.select({ count: count() }).from(labs),
      db.select({ count: count() }).from(appointments),
      db.select({ count: count() }).from(prescriptions),
      db.select({ count: count() }).from(notifications),
      db.select({ count: count() }).from(states),
      db.select({ count: count() }).from(cities)
    ]);

    console.log('\n📊 TABLE COUNTS:');
    console.log(`👥 Users: ${userCount[0].count}`);
    console.log(`🏥 Hospitals: ${hospitalCount[0].count}`);
    console.log(`👨‍⚕️ Doctors: ${doctorCount[0].count}`);
    console.log(`🤒 Patients: ${patientCount[0].count}`);
    console.log(`📋 Receptionists: ${receptionistCount[0].count}`);
    console.log(`🧪 Labs: ${labCount[0].count}`);
    console.log(`📅 Appointments: ${appointmentCount[0].count}`);
    console.log(`💊 Prescriptions: ${prescriptionCount[0].count}`);
    console.log(`🔔 Notifications: ${notificationCount[0].count}`);
    console.log(`🗺️  States: ${stateCount[0].count}`);
    console.log(`🏙️  Cities: ${cityCount[0].count}`);

    const totalRecords = userCount[0].count + hospitalCount[0].count + doctorCount[0].count + 
                        patientCount[0].count + receptionistCount[0].count + labCount[0].count + 
                        appointmentCount[0].count + prescriptionCount[0].count + notificationCount[0].count + 
                        stateCount[0].count + cityCount[0].count;

    console.log('\n' + '='.repeat(40));
    if (totalRecords === 0) {
      console.log('✅ DATABASE IS COMPLETELY EMPTY!');
      console.log('🎉 All data has been successfully deleted.');
    } else {
      console.log(`❌ DATABASE STILL HAS ${totalRecords} RECORDS`);
      console.log('Some data may not have been deleted.');
    }
    console.log('='.repeat(40));
    
  } catch (error) {
    console.error('❌ Error verifying database:', error);
  } finally {
    process.exit(0);
  }
}

verifyEmptyDatabase();



