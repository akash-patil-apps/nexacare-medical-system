// server/services/doctors.service.ts
import { db } from '../db';
import { doctors, appointments, users, hospitals } from '../../shared/schema';
import type { InsertDoctor } from '../../shared/schema-types';
import { eq, like, and, or, sql } from 'drizzle-orm';

/**
 * Create a new doctor profile.
 */
export const createDoctor = async (data: Omit<InsertDoctor, 'id' | 'createdAt'>) => {
  const displayName = (data as { fullName?: string }).fullName ?? 'Doctor';
  console.log(`👨‍⚕️ Creating doctor profile for ${displayName}`);
  
  const { fullName: _fn, ...rest } = data as Omit<InsertDoctor, 'id' | 'createdAt'> & { fullName?: string };
  const doctorData = {
    ...rest,
    createdAt: new Date(),
  };

  const result = await db.insert(doctors).values(doctorData as InsertDoctor).returning();
  console.log(`✅ Doctor created: ${result[0]?.id}`);
  
  return result;
};

/**
 * Get all doctors.
 */
export const getAllDoctors = async () => {
  console.log(`👨‍⚕️ Fetching all doctors`);
  const result = await db
    .select()
    .from(doctors)
    .where(sql`true`);
  
  return result;
};

/**
 * Get doctor by ID.
 */
export const getDoctorById = async (doctorId: number) => {
  if (
    typeof doctorId !== 'number' ||
    Number.isNaN(doctorId) ||
    !Number.isFinite(doctorId) ||
    !Number.isInteger(doctorId) ||
    doctorId <= 0
  ) {
    console.warn(`👨‍⚕️ getDoctorById called with invalid id`, {
      doctorId,
      type: typeof doctorId,
    });
    return null;
  }

  console.log(`👨‍⚕️ Fetching doctor ${doctorId}`);
  
  let doctor;
  try {
    // Try using raw SQL query as fallback if drizzle select fails
    // First attempt: use drizzle select with minimal fields
    try {
      const doctorResult = await db
        .select({
          id: doctors.id,
          userId: doctors.userId,
          hospitalId: doctors.hospitalId,
          specialty: doctors.specialty,
          consultationFee: doctors.consultationFee,
          qualification: doctors.qualification,
          licenseNumber: doctors.licenseNumber,
          isAvailable: doctors.isAvailable,
          isVerified: doctors.isVerified,
        })
        .from(doctors)
        .where(eq(doctors.id, doctorId))
        .limit(1);
      
      doctor = doctorResult[0];
    } catch (drizzleError: any) {
      console.warn(`⚠️ Drizzle select failed, trying raw SQL:`, drizzleError?.message);
      // Fallback to raw SQL
      const rawResult = await db.execute(
        sql`SELECT id, user_id, hospital_id, specialty, consultation_fee, qualification, license_number, is_available, is_verified, created_at FROM doctors WHERE id = ${doctorId} LIMIT 1`
      );
      const rawRows = (rawResult as unknown as { rows?: Record<string, unknown>[] }).rows;
      if (rawRows?.length) {
        const row = rawRows[0];
        doctor = {
          id: row.id as number,
          userId: row.user_id as number,
          hospitalId: row.hospital_id as number,
          specialty: row.specialty as string,
          consultationFee: row.consultation_fee as string,
          qualification: row.qualification as string,
          licenseNumber: row.license_number as string,
          isAvailable: row.is_available as boolean,
          isVerified: (row as Record<string, unknown>).is_verified as boolean,
          createdAt: row.created_at as Date,
        };
      }
    }
    
    if (!doctor) {
      console.log(`⚠️ No doctor found with id ${doctorId}`);
      return null;
    }
    
    console.log(`✅ Doctor found:`, { id: doctor.id, userId: doctor.userId, specialty: doctor.specialty });
  } catch (error: any) {
    console.error(`❌ Error in getDoctorById for doctor ${doctorId}:`, error);
    console.error(`❌ Error message:`, error?.message);
    console.error(`❌ Error stack:`, error?.stack);
    throw error;
  }

  // Get user information
  let user = null;
  if (doctor.userId) {
    const [userData] = await db
      .select({ 
        id: users.id,
        fullName: users.fullName,
        mobileNumber: users.mobileNumber,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, doctor.userId))
      .limit(1);
    
    if (userData) {
      user = userData;
    }
  }

  return {
    ...doctor,
    user,
  };
};

/**
 * Get doctor by user ID.
 */
export const getDoctorByUserId = async (userId: number) => {
  console.log(`👨‍⚕️ Fetching doctor by user ID ${userId}`);
  try {
    // First, get the doctor data
    const [doctorData] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);
    
    if (!doctorData) {
      console.log(`⚠️ No doctor found for user ID ${userId}`);
      return null;
    }
    
    // Then, get the hospital name if hospitalId exists
    let hospitalName: string | null = null;
    if (doctorData.hospitalId) {
      const [hospital] = await db
        .select({ name: hospitals.name })
        .from(hospitals)
        .where(eq(hospitals.id, doctorData.hospitalId))
        .limit(1);
      
      hospitalName = hospital?.name || null;
    }
    
    // Combine the results
    const doctor = {
      ...doctorData,
      hospitalName,
    };
    
    console.log(`✅ Doctor profile fetched:`, { 
      id: doctor.id, 
      hospitalId: doctor.hospitalId, 
      hospitalName: doctor.hospitalName 
    });
    
    return doctor;
  } catch (error: any) {
    console.error(`❌ Error fetching doctor by user ID ${userId}:`, error);
    throw error;
  }
};

/**
 * Get doctors in a hospital.
 */
export const getDoctorsByHospital = async (hospitalId: number) => {
  try {
    // Validate hospitalId
    if (!hospitalId || isNaN(hospitalId) || hospitalId <= 0) {
      console.error(`❌ Invalid hospitalId: ${hospitalId}`);
      throw new Error('Invalid hospital ID');
    }

    // First, get all doctors in the hospital
    const doctorsData = await db
      .select({
        id: doctors.id,
        userId: doctors.userId,
        hospitalId: doctors.hospitalId,
        specialty: doctors.specialty,
        licenseNumber: doctors.licenseNumber,
        qualification: doctors.qualification,
        experience: doctors.experience,
        consultationFee: doctors.consultationFee,
        isAvailable: doctors.isAvailable,
        workingHours: doctors.workingHours,
        availableSlots: doctors.availableSlots,
        status: doctors.status,
        languages: doctors.languages,
        awards: doctors.awards,
        bio: doctors.bio,
        createdAt: doctors.createdAt,
      })
      .from(doctors)
      .where(eq(doctors.hospitalId, hospitalId));
    
    // If no doctors found, return empty array
    if (!doctorsData || doctorsData.length === 0) {
      console.log(`⚠️ No doctors found for hospital ${hospitalId}`);
      return [];
    }
    
    // Then, enrich each doctor with user information
    const enrichedDoctors = await Promise.all(
      doctorsData.map(async (doctor) => {
        try {
          // Get user information
          if (!doctor.userId) {
            console.warn(`⚠️ Doctor ${doctor.id} has no userId`);
            return {
              ...doctor,
              fullName: null,
              mobileNumber: null,
              email: null,
            };
          }

          // Use the exact same pattern as appointments.service.ts - select only fullName (single field)
          let fullName: string | null = null;
          let mobileNumber: string | null = null;
          
          try {
            // Get fullName (exact same pattern as appointments.service.ts line 162)
            const [userResult] = await db
              .select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, doctor.userId))
              .limit(1);
            
            if (userResult) {
              fullName = userResult.fullName || null;
            }
            
            // Try to get mobileNumber separately (only if we need it, skip for now to avoid errors)
            // We can add this later if needed, but fullName is the critical field
          } catch (queryError: any) {
            console.error(`❌ Query error for doctor ${doctor.id}, userId ${doctor.userId}:`, queryError?.message);
            console.error(`❌ Error details:`, {
              message: queryError?.message,
              stack: queryError?.stack?.split('\n').slice(0, 3).join('\n')
            });
            // Continue with null values
          }
          
          return {
            ...doctor,
            fullName,
            mobileNumber: null, // Skip for now to avoid Drizzle errors
            email: null, // Users table doesn't have email field
          };
        } catch (userError: any) {
          console.error(`❌ Error fetching user data for doctor ${doctor.id}:`, userError);
          console.error(`❌ Error details:`, {
            message: userError?.message,
            stack: userError?.stack?.split('\n').slice(0, 3).join('\n')
          });
          // Return doctor data without user info if user lookup fails
          return {
            ...doctor,
            fullName: null,
            mobileNumber: null,
            email: null,
          };
        }
      })
    );
    
    return enrichedDoctors;
  } catch (error: any) {
    console.error(`❌ Error fetching doctors for hospital ${hospitalId}:`, error);
    console.error(`❌ Error stack:`, error.stack);
    throw error;
  }
};

/**
 * Get doctors by specialty.
 */
export const getDoctorsBySpecialty = async (specialty: string) => {
  const result = await db
    .select()
    .from(doctors)
    .where(eq(doctors.specialty, specialty));
  
  return result;
};

/**
 * Mark a doctor as verified.
 */
export const verifyDoctor = async (doctorId: number) => {
  console.log(`👨‍⚕️ Verifying doctor ${doctorId}`);
  const result = await db
    .update(doctors)
.set({
      isVerified: true,
    })
    .where(eq(doctors.id, doctorId))
    .returning();
  
  console.log(`✅ Doctor ${doctorId} verified`);
  return result;
};

/**
 * Get all doctors marked as available.
 */
export const getAvailableDoctors = async () => {
  const result = await db
    .select()
    .from(doctors)
    .where(eq(doctors.isAvailable, true));
  
  return result;
};

/**
 * Update doctor availability.
 */
export const updateDoctorAvailability = async (doctorId: number, isAvailable: boolean) => {
  console.log(`👨‍⚕️ Updating doctor ${doctorId} availability to ${isAvailable}`);
  const result = await db
    .update(doctors)
.set({
      isAvailable,
    })
    .where(eq(doctors.id, doctorId))
    .returning();
  
  console.log(`✅ Doctor ${doctorId} availability updated to ${isAvailable}`);
  return result;
};

/**
 * Update doctor profile.
 */
export const updateDoctorProfile = async (doctorId: number, data: Partial<InsertDoctor>) => {
  console.log(`👨‍⚕️ Updating doctor ${doctorId} profile`);
  const { updatedAt: _u, ...rest } = data as Partial<InsertDoctor> & { updatedAt?: unknown };
  const result = await db
    .update(doctors)
    .set(rest)
    .where(eq(doctors.id, doctorId))
    .returning();
  
  console.log(`✅ Doctor ${doctorId} profile updated`);
  return result;
};

/**
 * Get all appointments assigned to this doctor.
 */
export const getDoctorAppointments = async (doctorId: number) => {
  console.log(`👨‍⚕️ Fetching appointments for doctor ${doctorId}`);
  const result = await db
    .select()
    .from(appointments)
    .where(eq(appointments.doctorId, doctorId));
  
  console.log(`📋 Found ${result.length} appointments for doctor`);
  return result;
};

/**
 * Search doctors by name or specialty.
 */
export const searchDoctors = async (query: string) => {
  // Search is handled via joins with users table for name search
  // For now, return all doctors (can be enhanced later with proper search)
  const result = await db
    .select()
    .from(doctors);
  
  return result;
};

/**
 * Get doctor statistics.
 */
export const getDoctorStats = async (doctorId: number) => {
  console.log(`👨‍⚕️ Fetching stats for doctor ${doctorId}`);
  
  // Get appointments count
  const appointments = await getDoctorAppointments(doctorId);
  
  const stats = {
    totalAppointments: appointments.length,
    pendingAppointments: appointments.filter((apt: any) => apt.status === 'pending').length,
    confirmedAppointments: appointments.filter((apt: any) => apt.status === 'confirmed').length,
    completedAppointments: appointments.filter((apt: any) => apt.status === 'completed').length,
    cancelledAppointments: appointments.filter((apt: any) => apt.status === 'cancelled').length,
  };
  
  console.log(`📊 Doctor ${doctorId} stats:`, stats);
  return stats;
};
