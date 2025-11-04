// server/services/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, otpVerifications } from '../../drizzle/schema';
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
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  await db.insert(otpVerifications).values({
    mobileNumber,
    otp,
    expiresAt,
  });

  // Integrate SMS service here (e.g., Twilio)
  console.log(`Sending OTP ${otp} to ${mobileNumber}`);
  return { success: true, otp }; // Return OTP only in dev
};

/**
 * Verify OTP and register the user with password.
 */
export const verifyOtp = async ({
  mobileNumber,
  otp,
  password,
}: {
  mobileNumber: string;
  otp: string;
  password: string;
}) => {
  const [record] = await db
    .select()
    .from(otpVerifications)
    .where(eq(otpVerifications.mobileNumber, mobileNumber))
    .orderBy(otpVerifications.createdAt)
    .limit(1);

  if (!record || record.otp !== otp || isOtpExpired(record.expiresAt)) {
    throw new Error('Invalid or expired OTP');
  }

  await db.update(otpVerifications)
    .set({ isUsed: true })
    .where(eq(otpVerifications.id, record.id));

  return { success: true };
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
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  await db.insert(otpVerifications).values({
    mobileNumber,
    otp,
    expiresAt,
  });

  // Integrate SMS service here (e.g., Twilio)
  console.log(`Sending login OTP ${otp} to ${mobileNumber}`);
  return { success: true, otp }; // Return OTP only in dev
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
  const [user] = await db.select().from(users).where(eq(users.mobileNumber, mobileNumber)).limit(1);
  if (!user) throw new Error('User not found');

  const [record] = await db
    .select()
    .from(otpVerifications)
    .where(eq(otpVerifications.mobileNumber, mobileNumber))
    .orderBy(otpVerifications.createdAt)
    .limit(1);

  if (!record || record.otp !== otp || isOtpExpired(record.expiresAt)) {
    throw new Error('Invalid or expired OTP');
  }

  await db.update(otpVerifications)
    .set({ isUsed: true })
    .where(eq(otpVerifications.id, record.id));

  const token = generateToken({
    id: user.id,
    mobileNumber: user.mobileNumber,
    role: user.role,
    fullName: user.fullName,
  });

  return { user, token };
};

/**
 * Login user by verifying password and returning a token.
 */
export const loginUser = async ({
  mobileNumber,
  password,
}: {
  mobileNumber: string;
  password: string;
}) => {
  console.log(`🔍 Attempting to login user with mobile: ${mobileNumber}`);
  const [user] = await db.select().from(users).where(eq(users.mobileNumber, mobileNumber)).limit(1);
  
  if (!user) {
    console.error(`❌ User not found: ${mobileNumber}`);
    // Check if any users exist in database
    const userCount = await db.select().from(users).limit(1);
    console.log(`📊 Total users in database: ${userCount.length > 0 ? 'Some users exist' : 'No users found - database may need seeding'}`);
    throw new Error('User not found');
  }
  
  console.log(`✅ User found: ${user.fullName} (${user.role})`);

  const valid = await comparePasswords(password, user.password);
  if (!valid) throw new Error('Invalid password');

  const token = generateToken({
    id: user.id,
    mobileNumber: user.mobileNumber,
    role: user.role,
    fullName: user.fullName,
  });

  return { user, token };
};
