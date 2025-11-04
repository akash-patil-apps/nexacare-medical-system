import { db } from '../server/db';
import { users, patients, appointments, prescriptions, notifications } from '../shared/schema';

async function cleanupTestData() {
  try {
    console.log('🧹 CLEANING UP TEST DATA');
    console.log('=' .repeat(40));
    
    // Delete in reverse order of dependencies
    await db.delete(notifications);
    console.log('✅ Deleted all notifications');
    
    await db.delete(prescriptions);
    console.log('✅ Deleted all prescriptions');
    
    await db.delete(appointments);
    console.log('✅ Deleted all appointments');
    
    await db.delete(patients);
    console.log('✅ Deleted all patients');
    
    await db.delete(users);
    console.log('✅ Deleted all users');
    
    console.log('\n🎉 Database cleaned successfully!');
    console.log('Ready for fresh testing.');
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    process.exit(0);
  }
}

cleanupTestData();



