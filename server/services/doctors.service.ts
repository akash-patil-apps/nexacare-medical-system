// server/services/doctors.service.ts
import { db } from '../db';
import { doctors, appointments, users } from '../../shared/schema';
import type { InsertDoctor } from '../../shared/schema-types';
import { eq } from 'drizzle-orm';

/**
 * Create a new doctor profile.
 */
export const createDoctor = async (data: Omit<InsertDoctor, 'id' | 'createdAt'>) => {
  console.log(`👨‍⚕️ Creating doctor profile for ${data.fullName}`);
  
  const doctorData = {
    ...data,
    createdAt: new Date()
  };

  const result = await db.insert(doctors).values(doctorData).returning();
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
    .where(() => true);
  
  console.log(`📋 Found ${result.length} doctors`);
  return result;
};

/**
 * Get doctor by ID.
 */
export const getDoctorById = async (doctorId: number) => {
  console.log(`👨‍⚕️ Fetching doctor ${doctorId}`);
  const result = await db
    .select()
    .from(doctors)
    .where((condition: any) => condition(doctorId));
  
  return result[0] || null;
};

/**
 * Get doctors in a hospital.
 */
export const getDoctorsByHospital = async (hospitalId: number) => {
  console.log(`👨‍⚕️ Fetching doctors for hospital ${hospitalId}`);
  const result = await db
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
      approvalStatus: doctors.approvalStatus,
      createdAt: doctors.createdAt,
      // User information
      fullName: users.fullName,
      mobileNumber: users.mobileNumber,
      email: users.email
    })
    .from(doctors)
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(eq(doctors.hospitalId, hospitalId));
  
  console.log(`📋 Found ${result.length} doctors in hospital`);
  return result;
};

/**
 * Get doctors by specialty.
 */
export const getDoctorsBySpecialty = async (specialty: string) => {
  console.log(`👨‍⚕️ Fetching doctors with specialty: ${specialty}`);
  const result = await db
    .select()
    .from(doctors)
    .where((condition: any) => condition(specialty));
  
  console.log(`📋 Found ${result.length} doctors with specialty ${specialty}`);
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
      updatedAt: new Date()
    })
    .where((condition: any) => condition(doctorId))
    .returning();
  
  console.log(`✅ Doctor ${doctorId} verified`);
  return result;
};

/**
 * Get all doctors marked as available.
 */
export const getAvailableDoctors = async () => {
  console.log(`👨‍⚕️ Fetching available doctors`);
  const result = await db
    .select()
    .from(doctors)
    .where((condition: any) => condition(true));
  
  console.log(`📋 Found ${result.length} available doctors`);
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
      updatedAt: new Date()
    })
    .where((condition: any) => condition(doctorId))
    .returning();
  
  console.log(`✅ Doctor ${doctorId} availability updated to ${isAvailable}`);
  return result;
};

/**
 * Update doctor profile.
 */
export const updateDoctorProfile = async (doctorId: number, data: Partial<InsertDoctor>) => {
  console.log(`👨‍⚕️ Updating doctor ${doctorId} profile`);
  const updateData = {
    ...data,
    updatedAt: new Date()
  };
  
  const result = await db
    .update(doctors)
    .set(updateData)
    .where((condition: any) => condition(doctorId))
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
    .where((condition: any) => condition(doctorId));
  
  console.log(`📋 Found ${result.length} appointments for doctor`);
  return result;
};

/**
 * Search doctors by name or specialty.
 */
export const searchDoctors = async (query: string) => {
  console.log(`👨‍⚕️ Searching doctors with query: ${query}`);
  const result = await db
    .select()
    .from(doctors)
    .where((condition: any) => condition(query));
  
  console.log(`📋 Found ${result.length} doctors matching search`);
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
