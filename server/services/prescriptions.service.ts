// server/services/prescriptions.service.ts
import { db } from '../db';
import { prescriptions } from '../../shared/schema';
import type { InsertPrescription } from '../../shared/schema-types';

/**
 * Issue a new prescription (Doctor only).
 */
export const issuePrescription = async (data: InsertPrescription) => {
  console.log(`💊 Creating prescription for patient ${data.patientId} by doctor ${data.doctorId}`);
  
  const prescriptionData = {
    ...data,
    createdAt: new Date()
  };

  const result = await db.insert(prescriptions).values(prescriptionData).returning();
  console.log(`✅ Prescription created: ${result[0]?.id}`);
  
  return result;
};

/**
 * Create a new prescription (alias for issuePrescription).
 */
export const createPrescription = issuePrescription;

/**
 * Get prescriptions by patient ID.
 */
export const getPrescriptionsByPatient = async (patientId: number) => {
  console.log(`💊 Fetching prescriptions for patient ${patientId}`);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(patientId));
  
  console.log(`📋 Found ${result.length} prescriptions for patient`);
  return result;
};

/**
 * Get prescriptions by doctor ID.
 */
export const getPrescriptionsByDoctor = async (doctorId: number) => {
  console.log(`💊 Fetching prescriptions by doctor ${doctorId}`);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(doctorId));
  
  console.log(`📋 Found ${result.length} prescriptions by doctor`);
  return result;
};

/**
 * Get prescriptions by hospital ID.
 */
export const getPrescriptionsByHospital = async (hospitalId: number) => {
  console.log(`💊 Fetching prescriptions for hospital ${hospitalId}`);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(hospitalId));
  
  console.log(`📋 Found ${result.length} prescriptions for hospital`);
  return result;
};


/**
 * Deactivate prescription.
 */
export const deactivatePrescription = async (prescriptionId: number, userId: number) => {
  console.log(`💊 Deactivating prescription ${prescriptionId}`);
  
  const result = await db
    .update(prescriptions)
    .set({ 
      isActive: false,
      updatedAt: new Date()
    })
    .where((condition: any) => condition(prescriptionId))
    .returning();
  
  console.log(`✅ Prescription ${prescriptionId} deactivated`);
  return result[0];
};

/**
 * Get active prescriptions by patient.
 */
export const getActivePrescriptionsByPatient = async (patientId: number) => {
  console.log(`💊 Fetching active prescriptions for patient ${patientId}`);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(patientId, true));
  
  console.log(`📋 Found ${result.length} active prescriptions for patient`);
  return result;
};

/**
 * Get prescriptions by appointment ID.
 */
export const getPrescriptionsByAppointment = async (appointmentId: number) => {
  console.log(`💊 Fetching prescriptions for appointment ${appointmentId}`);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(appointmentId));
  
  console.log(`📋 Found ${result.length} prescriptions for appointment`);
  return result;
};

/**
 * Get prescriptions needing follow-up.
 */
export const getPrescriptionsNeedingFollowUp = async (date: Date) => {
  console.log(`💊 Fetching prescriptions needing follow-up before ${date}`);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(date));
  
  console.log(`📋 Found ${result.length} prescriptions needing follow-up`);
  return result;
};

/**
 * Get prescriptions for patient (logged-in patient).
 */
export const getPrescriptionsForPatient = async (patientId: number) => {
  console.log(`💊 Fetching prescriptions for patient ${patientId}`);
  return await getPrescriptionsByPatient(patientId);
};

/**
 * Get prescriptions by filters.
 */
export const getPrescriptionsByFilters = async (filters: {
  patientId: number;
  hospitalId?: number;
  from?: Date;
  to?: Date;
}) => {
  console.log(`💊 Fetching prescriptions with filters:`, filters);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(filters));
  
  console.log(`📋 Found ${result.length} prescriptions matching filters`);
  return result;
};

/**
 * Update prescription by doctor.
 */
export const updatePrescription = async (
  doctorId: number,
  prescriptionId: number,
  data: Partial<InsertPrescription>
) => {
  console.log(`💊 Doctor ${doctorId} updating prescription ${prescriptionId}`);
  
  const updateData = {
    ...data,
    updatedAt: new Date()
  };
  
  const result = await db
    .update(prescriptions)
    .set(updateData)
    .where((condition: any) => condition(prescriptionId, doctorId))
    .returning();
  
  console.log(`✅ Prescription ${prescriptionId} updated by doctor ${doctorId}`);
  return result[0] || null;
};

/**
 * Delete prescription by doctor.
 */
export const deletePrescription = async (doctorId: number, prescriptionId: number) => {
  console.log(`💊 Doctor ${doctorId} deleting prescription ${prescriptionId}`);
  
  const result = await db
    .update(prescriptions)
    .set({ 
      isActive: false,
      updatedAt: new Date()
    })
    .where((condition: any) => condition(prescriptionId, doctorId))
    .returning();
  
  console.log(`✅ Prescription ${prescriptionId} deleted by doctor ${doctorId}`);
  return result;
};

/**
 * Get prescriptions for doctor with filters.
 */
export const getPrescriptionsForDoctor = async (filters: {
  doctorId: number;
  search?: string;
  hospitalId?: number;
  from?: Date;
  to?: Date;
  status?: string;
  limit?: number;
}) => {
  console.log(`💊 Fetching prescriptions for doctor ${filters.doctorId} with filters:`, filters);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(filters));
  
  console.log(`📋 Found ${result.length} prescriptions for doctor`);
  return result;
};

/**
 * Get prescriptions for hospital with filters.
 */
export const getPrescriptionsForHospital = async (filters: {
  hospitalId: number;
  search?: string;
  doctorId?: number;
  from?: Date;
  to?: Date;
  status?: string;
  limit?: number;
}) => {
  console.log(`💊 Fetching prescriptions for hospital ${filters.hospitalId} with filters:`, filters);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(filters));
  
  console.log(`📋 Found ${result.length} prescriptions for hospital`);
  return result;
};

/**
 * Get prescription by ID with authorization check.
 */
export const getPrescriptionById = async (
  prescriptionId: number, 
  userId: number, 
  userRole: string
) => {
  console.log(`💊 User ${userId} (${userRole}) fetching prescription ${prescriptionId}`);
  const result = await db
    .select()
    .from(prescriptions)
    .where((condition: any) => condition(prescriptionId, userId, userRole));
  
  return result[0] || null;
};
