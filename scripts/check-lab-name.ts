// Script to find lab name for user 9840000000
import { db } from '../server/db';
import { labs, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function findLabName() {
  try {
    console.log('🔍 Finding lab for user: 9840000000 (Lab Admin 1)\n');
    
    // Find user
    const [user] = await db.select().from(users).where(eq(users.mobileNumber, '9840000000')).limit(1);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ Found user:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.fullName);
    console.log('   Role:', user.role);
    
    // Find lab
    const [lab] = await db.select().from(labs).where(eq(labs.userId, user.id)).limit(1);
    
    if (!lab) {
      console.log('\n❌ No lab found for this user');
      return;
    }
    
    console.log('\n✅ Found lab:');
    console.log('   Lab Name:', lab.name);
    console.log('   Lab ID:', lab.id);
    console.log('   City:', lab.city);
    console.log('   Address:', lab.address);
    console.log('   License:', lab.licenseNumber);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findLabName();

