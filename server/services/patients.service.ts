// server/services/patients.service.ts
import { db } from "../db";
import { patients, users, patientFamilyMembers } from "../../shared/schema";
import { InsertPatient } from "../../shared/schema-types";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyOtp } from "./auth.service";

/**
 * Get patient by ID.
 */
export const getPatientById = async (patientId: number) => {
  console.log(`🏥 Fetching patient ${patientId}`);
  const result = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId));
  
  return result[0] || null;
};

/**
 * Get patient by user ID.
 */
export const getPatientByUserId = async (userId: number) => {
  console.log(`🏥 Fetching patient by user ID ${userId}`);
  const result = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, userId));

  return result[0] || null;
};

/**
 * Get patient with user info by patient ID (for family members).
 */
export const getPatientWithUserById = async (patientId: number) => {
  console.log(`🏥 Fetching patient ${patientId} with user info`);
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);
  
  if (!patient) return null;
  
  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      mobileNumber: users.mobileNumber,
    })
    .from(users)
    .where(eq(users.id, patient.userId))
    .limit(1);
  
  return { ...patient, user };
};

/**
 * Create new patient profile.
 */
export const createPatient = async (data: Omit<InsertPatient, 'id' | 'createdAt'>) => {
  console.log(`🏥 Creating patient profile for user ${data.userId}`);
  
  const patientData = {
    ...data,
    createdAt: new Date()
  };

  const result = await db.insert(patients).values(patientData).returning();
  console.log(`✅ Patient created: ${result[0]?.id}`);
  
  return result;
};

/**
 * Get all patients.
 */
export const getAllPatients = async () => {
  console.log(`🏥 Fetching all patients`);
  const result = await db
    .select()
    .from(patients)
    .where(() => true);
  
  console.log(`📋 Found ${result.length} patients`);
  return result;
};

/**
 * Update patient by user ID.
 */
export const updatePatientByUserId = async (userId: number, data: Partial<InsertPatient>) => {
  console.log(`🏥 Updating patient for user ${userId}`);
  const updateData = {
    ...data,
    updatedAt: new Date()
  };
  
  const result = await db
    .update(patients)
    .set(updateData)
    .where((condition: any) => condition(userId))
    .returning();
  
  console.log(`✅ Patient updated for user ${userId}`);
  return result[0] || null;
};

/**
 * Update patient by ID.
 */
export const updatePatientById = async (patientId: number, data: Partial<InsertPatient>) => {
  console.log(`🏥 Updating patient ${patientId}`);
  const updateData = {
    ...data,
    updatedAt: new Date()
  };
  
  const result = await db
    .update(patients)
    .set(updateData)
    .where((condition: any) => condition(patientId))
    .returning();
  
  console.log(`✅ Patient ${patientId} updated`);
  return result[0] || null;
};

/**
 * Get patients by hospital (via appointments).
 */
export const getPatientsByHospital = async (hospitalId: number) => {
  console.log(`🏥 Fetching patients for hospital ${hospitalId} (via appointments)`);
  const result = await db
    .select()
    .from(patients)
    .where((condition: any) => condition(hospitalId));
  
  console.log(`📋 Found ${result.length} patients for hospital`);
  return result;
};

/**
 * Search patients by name or mobile number.
 */
export const searchPatients = async (query: string) => {
  console.log(`🏥 Searching patients with query: ${query}`);
  const result = await db
    .select()
    .from(patients)
    .where((condition: any) => condition(query));
  
  console.log(`📋 Found ${result.length} patients matching search`);
  return result;
};

/**
 * Get patient statistics.
 */
export const getPatientStats = async (patientId: number) => {
  console.log(`🏥 Fetching stats for patient ${patientId}`);
  
  // This would typically join with appointments table
  const stats = {
    totalAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    totalPrescriptions: 0,
    activePrescriptions: 0,
  };
  
  console.log(`📊 Patient ${patientId} stats:`, stats);
  return stats;
};

const FAMILY_RELATIONSHIPS = ['mother', 'father', 'brother', 'sister', 'spouse', 'son', 'daughter', 'other'] as const;

/**
 * Get family members for a primary patient (by their user ID).
 */
export const getFamilyMembers = async (primaryPatientUserId: number) => {
  const primary = await getPatientByUserId(primaryPatientUserId);
  if (!primary) return [];

  const rows = await db
    .select({
      id: patientFamilyMembers.id,
      relationship: patientFamilyMembers.relationship,
      relatedPatientId: patientFamilyMembers.relatedPatientId,
      fullName: users.fullName,
      mobileNumber: users.mobileNumber,
      email: users.email,
    })
    .from(patientFamilyMembers)
    .innerJoin(patients, eq(patients.id, patientFamilyMembers.relatedPatientId))
    .innerJoin(users, eq(users.id, patients.userId))
    .where(eq(patientFamilyMembers.primaryPatientId, primary.id));

  return rows;
};

/**
 * Check if a patientId is the logged-in patient or one of their family members.
 */
export const canActAsPatient = async (primaryPatientUserId: number, patientId: number): Promise<boolean> => {
  const primary = await getPatientByUserId(primaryPatientUserId);
  if (!primary) return false;
  if (primary.id === patientId) return true;

  const [link] = await db
    .select({ id: patientFamilyMembers.id })
    .from(patientFamilyMembers)
    .where(
      and(
        eq(patientFamilyMembers.primaryPatientId, primary.id),
        eq(patientFamilyMembers.relatedPatientId, patientId)
      )
    )
    .limit(1);

  return !!link;
};

/**
 * Add a family member: verify OTP, then either link existing PATIENT user or create new user + patient + link.
 * If user with mobile already exists and is PATIENT: link (or return alreadyAdded). Otherwise create new.
 */
export const addFamilyMember = async (
  primaryPatientUserId: number,
  data: {
    relationship: string;
    mobileNumber: string;
    otp: string;
    fullName?: string;
    email?: string | null;
    password?: string;
    dateOfBirth?: string | Date | null;
    gender?: string | null;
    bloodGroup?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    emergencyContact?: string | null;
    emergencyContactName?: string | null;
    emergencyRelation?: string | null;
    medicalHistory?: string | null;
    allergies?: string | null;
    currentMedications?: string | null;
    chronicConditions?: string | null;
    insuranceProvider?: string | null;
    insuranceNumber?: string | null;
    occupation?: string | null;
    maritalStatus?: string | null;
    [key: string]: unknown;
  }
) => {
  const relationship = String(data.relationship).toLowerCase().trim();
  if (!FAMILY_RELATIONSHIPS.includes(relationship as any)) {
    throw new Error(`Invalid relationship. Allowed: ${FAMILY_RELATIONSHIPS.join(', ')}`);
  }

  const primary = await getPatientByUserId(primaryPatientUserId);
  if (!primary) throw new Error('Primary patient not found');

  const trimmedMobile = String(data.mobileNumber).trim();
  if (trimmedMobile.length < 10 || trimmedMobile.length > 15) {
    throw new Error('Invalid mobile number');
  }

  await verifyOtp(trimmedMobile, String(data.otp));

  const existingUser = await db.select().from(users).where(eq(users.mobileNumber, trimmedMobile)).limit(1);
  if (existingUser.length > 0) {
    const [existing] = existingUser;
    if (existing.role?.toUpperCase() !== 'PATIENT') {
      throw new Error('A user with this mobile number already exists with a different role.');
    }
    const [existingPatient] = await db.select().from(patients).where(eq(patients.userId, existing.id)).limit(1);
    if (!existingPatient) throw new Error('Patient profile not found for this user.');

    const [existingLink] = await db
      .select()
      .from(patientFamilyMembers)
      .where(
        and(
          eq(patientFamilyMembers.primaryPatientId, primary.id),
          eq(patientFamilyMembers.relatedPatientId, existingPatient.id)
        )
      )
      .limit(1);

    if (existingLink) {
      return { success: true, alreadyAdded: true, patient: existingPatient };
    }

    await db.insert(patientFamilyMembers).values({
      primaryPatientId: primary.id,
      relatedPatientId: existingPatient.id,
      relationship,
    });
    return { success: true, linked: true, patient: existingPatient };
  }

  if (!data.fullName?.trim()) throw new Error('Full name is required for new family member.');
  if (!data.password || String(data.password).length < 6) throw new Error('Password (min 6 characters) is required.');

  const emailRaw = data.email && String(data.email).trim();
  const trimmedEmail =
    emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)
      ? emailRaw
      : `fam_${primary.id}_${trimmedMobile}_${Date.now()}@nexacare.local`;

  const [existingEmailRow] = await db.select().from(users).where(eq(users.email, trimmedEmail)).limit(1);
  const finalEmail = existingEmailRow ? `fam_${primary.id}_${trimmedMobile}_${Date.now()}@nexacare.local` : trimmedEmail;

  const hashedPassword = await hashPassword(data.password!);

  const result = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        fullName: data.fullName!.trim(),
        mobileNumber: trimmedMobile,
        email: finalEmail,
        password: hashedPassword,
        role: 'PATIENT',
        isVerified: true,
      })
      .returning();

    let dateOfBirthValue: Date | null = null;
    if (data.dateOfBirth) {
      const d = data.dateOfBirth instanceof Date ? data.dateOfBirth : new Date(String(data.dateOfBirth));
      if (!isNaN(d.getTime())) dateOfBirthValue = d;
    }

    const [newPatient] = await tx
      .insert(patients)
      .values({
        userId: newUser.id,
        dateOfBirth: dateOfBirthValue,
        gender: data.gender || null,
        bloodGroup: data.bloodGroup || null,
        height: data.height ? String(data.height) : null,
        weight: data.weight ? String(data.weight) : null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        emergencyContact: data.emergencyContact || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyRelation: data.emergencyRelation || null,
        medicalHistory: data.medicalHistory || null,
        allergies: data.allergies || null,
        currentMedications: data.currentMedications || null,
        chronicConditions: data.chronicConditions || null,
        insuranceProvider: data.insuranceProvider || null,
        insuranceNumber: data.insuranceNumber || null,
        occupation: data.occupation || null,
        maritalStatus: data.maritalStatus || null,
      })
      .returning();

    await tx.insert(patientFamilyMembers).values({
      primaryPatientId: primary.id,
      relatedPatientId: newPatient.id,
      relationship,
    });

    return { success: true, user: newUser, patient: newPatient };
  });

  return result;
};
