// Simple auth service for demo - no database dependencies
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateOTP, isOtpExpired } from '../utils/otp';
import { getJwtSecret } from '../env';

const JWT_EXPIRES_IN = '7d';

// In-memory storage for demo
const users: any[] = [
  // Demo users for testing
  {
    id: 1,
    mobileNumber: '9876543210',
    fullName: 'Dr. John Smith',
    email: 'john@nexacare.com',
    role: 'doctor',
    password: '$2b$10$demo.hash.for.testing', // Will be replaced with real hash
    isVerified: true,
    createdAt: new Date()
  },
  {
    id: 2,
    mobileNumber: '9876543211',
    fullName: 'Jane Doe',
    email: 'jane@nexacare.com',
    role: 'patient',
    password: '$2b$10$demo.hash.for.testing', // Will be replaced with real hash
    isVerified: true,
    createdAt: new Date()
  },
  {
    id: 3,
    mobileNumber: '9876543212',
    fullName: 'Hospital Admin',
    email: 'admin@nexacare.com',
    role: 'hospital',
    password: '$2b$10$demo.hash.for.testing', // Will be replaced with real hash
    isVerified: true,
    createdAt: new Date()
  }
];

const otpVerifications: any[] = [];

// Log demo users on startup
console.log('\n👥 Demo Users Available:');
users.forEach(user => {
  console.log(`📱 ${user.mobileNumber} - ${user.fullName} (${user.role})`);
});
console.log('🔑 Password: password123 (for all demo users)\n');

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const comparePasswords = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const generateToken = (user: {
  id: number;
  mobileNumber: string;
  role: string;
  fullName: string;
}) => jwt.sign(user, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });

/**
 * Send OTP for mobile registration/login.
 */
export const sendOtp = async (mobileNumber: string, role: string) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Store OTP in memory
  otpVerifications.push({
    mobileNumber,
    otp,
    expiresAt,
    isUsed: false,
    createdAt: new Date()
  });

  // Log for demo
  console.log(`\n🔑 OTP Generated for ${mobileNumber}: ${otp}`);
  console.log(`👤 Role: ${role}`);
  console.log(`⏰ Expires: ${expiresAt}\n`);

  return { 
    success: true, 
    otp: otp,
    mobileNumber: mobileNumber,
    message: `OTP ${otp} generated for ${mobileNumber}`
  };
};

/**
 * Verify OTP for registration.
 */
export const verifyOtp = async ({
  mobileNumber,
  otp,
}: {
  mobileNumber: string;
  otp: string;
}) => {
  // Find the latest OTP for this mobile number
  const record = otpVerifications
    .filter(v => v.mobileNumber === mobileNumber && !v.isUsed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!record || record.otp !== otp || isOtpExpired(record.expiresAt)) {
    throw new Error('Invalid or expired OTP');
  }

  // Mark OTP as used
  record.isUsed = true;

  return { success: true };
};

/**
 * Register user after OTP is verified.
 */
export const registerUser = async (userData: {
  mobileNumber: string;
  fullName: string;
  email: string;
  role: string;
  password: string;
}) => {
  const hashedPassword = await hashPassword(userData.password);

  const newUser = {
    id: Math.floor(Math.random() * 10000),
    ...userData,
    password: hashedPassword,
    isVerified: true,
    createdAt: new Date()
  };

  users.push(newUser);

  const token = generateToken({
    id: newUser.id,
    mobileNumber: newUser.mobileNumber,
    role: newUser.role,
    fullName: newUser.fullName,
  });

  console.log(`\n✅ User registered: ${newUser.fullName} (${newUser.role})`);
  console.log(`📱 Mobile: ${newUser.mobileNumber}\n`);

  return { user: newUser, token };
};

/**
 * Send OTP for login.
 */
export const sendLoginOtp = async (mobileNumber: string) => {
  // Find user
  const user = users.find(u => u.mobileNumber === mobileNumber);
  if (!user) throw new Error('User not found');

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  // Store OTP in memory
  otpVerifications.push({
    mobileNumber,
    otp,
    expiresAt,
    isUsed: false,
    createdAt: new Date()
  });

  // Log for demo
  console.log(`\n🔑 Login OTP for ${mobileNumber}: ${otp}`);
  console.log(`👤 User: ${user.fullName} (${user.role})`);
  console.log(`⏰ Expires: ${expiresAt}\n`);

  return { 
    success: true, 
    otp: otp,
    mobileNumber: mobileNumber,
    message: `Login OTP ${otp} generated for ${mobileNumber}`
  };
};

/**
 * Login user by verifying OTP.
 */
export const loginUserWithOtp = async ({
  mobileNumber,
  otp,
}: {
  mobileNumber: string;
  otp: string;
}) => {
  // Find user
  const user = users.find(u => u.mobileNumber === mobileNumber);
  if (!user) throw new Error('User not found');

  // Find and verify OTP
  const record = otpVerifications
    .filter(v => v.mobileNumber === mobileNumber && !v.isUsed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!record || record.otp !== otp || isOtpExpired(record.expiresAt)) {
    throw new Error('Invalid or expired OTP');
  }

  // Mark OTP as used
  record.isUsed = true;

  const token = generateToken({
    id: user.id,
    mobileNumber: user.mobileNumber,
    role: user.role,
    fullName: user.fullName,
  });

  console.log(`\n✅ User logged in: ${user.fullName} (${user.role})\n`);

  return { user, token };
};

/**
 * Login user by verifying password.
 */
export const loginUser = async ({
  mobileNumber,
  password,
}: {
  mobileNumber: string;
  password: string;
}) => {
  // Find user
  const user = users.find(u => u.mobileNumber === mobileNumber);
  if (!user) throw new Error('User not found');

  // For demo users, accept 'password123' as valid password
  const isDemoUser = user.password === '$2b$10$demo.hash.for.testing';
  const valid = isDemoUser ? password === 'password123' : await comparePasswords(password, user.password);
  
  if (!valid) throw new Error('Invalid password');

  const token = generateToken({
    id: user.id,
    mobileNumber: user.mobileNumber,
    role: user.role,
    fullName: user.fullName,
  });

  console.log(`\n✅ User logged in: ${user.fullName} (${user.role})\n`);

  return { user, token };
};
