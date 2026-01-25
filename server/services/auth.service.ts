// server/services/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../db';
import { users, otpVerifications } from '../../shared/schema';
import { generateOTP, isOtpExpired } from '../utils/otp';
import type {
  InsertUser,
} from '../../shared/schema-types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const comparePasswords = (password: string, hash: string) =>
  bcrypt.compare(password, hash);

export const generateToken = (user: {
  id: number;
  mobileNumber: string;
  role: string;
  fullName: string;
}) => jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

/**
 * Send OTP for mobile registration/login.
 */
export const sendOtp = async (mobileNumber: string, role: string) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  await db.insert(otpVerifications).values({
    mobileNumber: String(mobileNumber).trim(),
    otp: String(otp).trim(),
    expiresAt: expiresAt, // Pass Date object directly - Drizzle will handle conversion
    isUsed: false,
  });

  console.log(`✅ OTP ${otp} sent to ${mobileNumber} (expires in 5 minutes)`);
  return { success: true, otp }; // Return OTP for development
};

/**
 * Verify OTP - Simple and robust implementation
 */
export const verifyOtp = async (mobileNumber: string, otp: string) => {
  // Normalize inputs
  const normalizedMobile = String(mobileNumber).trim();
  const normalizedOtp = String(otp).trim();

  console.log(`🔍 Verifying OTP: mobile=${normalizedMobile}, otp=${normalizedOtp}`);

  // Find the most recent unused OTP for this mobile number
  const records = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.mobileNumber, normalizedMobile),
        eq(otpVerifications.isUsed, false)
      )
    )
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);

  if (records.length === 0) {
    console.error(`❌ No unused OTP found for ${normalizedMobile}`);
    throw new Error('Invalid or expired OTP');
  }

  const record = records[0];
  const storedOtp = String(record.otp).trim();
  // Handle expiresAt - it might be a Date object or a string from database
  const expiresAt = record.expiresAt instanceof Date 
    ? record.expiresAt 
    : new Date(record.expiresAt);
  const now = new Date();

  console.log(`📋 OTP Record: stored="${storedOtp}", expiresAt="${expiresAt.toISOString()}", now="${now.toISOString()}"`);

  // Check if expired
  if (now > expiresAt) {
    console.error(`❌ OTP expired. Expired at ${expiresAt.toISOString()}, current time ${now.toISOString()}`);
    throw new Error('Invalid or expired OTP');
  }

  // Compare OTPs
  if (storedOtp !== normalizedOtp) {
    console.error(`❌ OTP mismatch. Expected "${storedOtp}", got "${normalizedOtp}"`);
    throw new Error('Invalid or expired OTP');
  }

  // Mark as used
  await db
    .update(otpVerifications)
    .set({ isUsed: true })
    .where(eq(otpVerifications.id, record.id));

  console.log(`✅ OTP verified successfully for ${normalizedMobile}`);
  return { success: true, mobileNumber: normalizedMobile };
};

/**
 * Register user after OTP is verified.
 */
export const registerUser = async (user: Omit<InsertUser, 'id' | 'createdAt' | 'isVerified'>) => {
  const hashedPassword = await hashPassword(user.password);

  const [createdUser] = await db.insert(users).values({
    ...user,
    password: hashedPassword,
    isVerified: true,
  }).returning();

  const token = generateToken({
    id: createdUser.id,
    mobileNumber: createdUser.mobileNumber,
    role: createdUser.role,
    fullName: createdUser.fullName,
  });

  return { user: createdUser, token };
};

/**
 * Send OTP for login.
 */
export const sendLoginOtp = async (mobileNumber: string) => {
  const [user] = await db.select().from(users).where(eq(users.mobileNumber, mobileNumber)).limit(1);
  if (!user) throw new Error('User not found');

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.insert(otpVerifications).values({
    mobileNumber: String(mobileNumber).trim(),
    otp: String(otp).trim(),
    expiresAt: expiresAt, // Pass Date object directly - Drizzle will handle conversion
    isUsed: false,
  });

  console.log(`✅ Login OTP ${otp} sent to ${mobileNumber}`);
  return { success: true, otp }; // Return OTP for development
};

/**
 * Login user by verifying OTP and returning a token.
 */
export const loginUserWithOtp = async ({
  mobileNumber,
  otp,
}: {
  mobileNumber: string;
  otp: string;
}) => {
  // Verify OTP first
  await verifyOtp(mobileNumber, otp);

  // Get user
  const [user] = await db.select().from(users).where(eq(users.mobileNumber, mobileNumber)).limit(1);
  if (!user) throw new Error('User not found');

  const token = generateToken({
    id: user.id,
    mobileNumber: user.mobileNumber,
    role: user.role,
    fullName: user.fullName,
  });

  return { user, token };
};

/**
 * Login user with password.
 */
export const loginUser = async ({
  mobileNumber,
  password,
}: {
  mobileNumber: string;
  password: string;
}) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.mobileNumber, mobileNumber))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  const isPasswordValid = await comparePasswords(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  const token = generateToken({
    id: user.id,
    mobileNumber: user.mobileNumber,
    role: user.role,
    fullName: user.fullName,
  });

  return { user, token };
};

/**
 * Send OTP for password reset - checks if user exists first
 */
export const sendPasswordResetOtp = async (mobileNumber: string) => {
  // Check if user exists
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.mobileNumber, mobileNumber))
    .limit(1);

  if (!user) {
    throw new Error('User not found with this mobile number');
  }

  // Send OTP (reuse existing sendOtp function)
  const result = await sendOtp(mobileNumber, user.role);
  return { ...result, mobileNumber };
};

/**
 * Verify OTP for password reset
 */
export const verifyPasswordResetOtp = async (mobileNumber: string, otp: string) => {
  // Verify OTP (reuse existing verifyOtp function)
  const result = await verifyOtp(mobileNumber, otp);
  return result;
};

/**
 * Reset password after OTP verification
 */
export const resetPassword = async (mobileNumber: string, newPassword: string) => {
  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.mobileNumber, mobileNumber))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password in database
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.mobileNumber, mobileNumber));

  console.log(`✅ Password reset successfully for ${mobileNumber}`);
  return { success: true, message: 'Password reset successfully' };
};
