// Script to create test user 9833402458 (Pooja Singh) if it doesn't exist
import { db } from '../server/db';
// Note: db uses shared/schema which requires email field
import { users, patients } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../server/utils/password';

async function createTestUser() {
  try {
    const mobileNumber = '9833402458';
    const password = 'password123';
    const fullName = 'Pooja Singh';
    const role = 'PATIENT';
    const email = `pooja.singh.${mobileNumber}@nexacare.com`; // Generate email from mobile number
    
    console.log(`🔍 Checking for user: ${mobileNumber}`);
    
    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.mobileNumber, mobileNumber)).limit(1);
    
    if (existingUser) {
      console.log('✅ User already exists:');
      console.log('  - ID:', existingUser.id);
      console.log('  - Name:', existingUser.fullName);
      console.log('  - Role:', existingUser.role);
      process.exit(0);
      return;
    }
    
    console.log('📝 Creating new user...');
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const [newUser] = await db.insert(users).values({
      mobileNumber,
      email,
      password: hashedPassword,
      fullName,
      role,
      isVerified: true,
    }).returning();
    
    console.log('✅ User created:');
    console.log('  - ID:', newUser.id);
    console.log('  - Name:', newUser.fullName);
    console.log('  - Role:', newUser.role);
    console.log('  - Mobile:', newUser.mobileNumber);
    
    // Create patient record
    console.log('\n📝 Creating patient record...');
    const [newPatient] = await db.insert(patients).values({
      userId: newUser.id,
      gender: 'Female',
      city: 'Mumbai',
      state: 'Maharashtra',
      bloodGroup: 'A+',
    }).returning();
    
    console.log('✅ Patient record created:');
    console.log('  - Patient ID:', newPatient.id);
    console.log('  - User ID:', newPatient.userId);
    
    console.log('\n🎉 Test user created successfully!');
    console.log(`\n📱 Login credentials:`);
    console.log(`   Mobile: ${mobileNumber}`);
    console.log(`   Password: ${password}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUser();

