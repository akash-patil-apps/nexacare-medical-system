// server/services/appointments.service.ts
import { db } from '../db';
import { appointments, patients, doctors, hospitals, users } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { InsertAppointment } from '../../shared/schema-types';

/**
 * Book a new appointment.
 */
export const bookAppointment = async (
  data: Omit<InsertAppointment, 'id' | 'createdAt' | 'status'>,
  user: { id: number; mobileNumber: string; role: string; fullName: string }
) => {
  console.log(`📅 Creating appointment for patient ${data.patientId} with doctor ${data.doctorId}`);
  
  try {
    console.log('📅 Appointment data being inserted:', {
      patientId: data.patientId,
      doctorId: data.doctorId,
      hospitalId: data.hospitalId,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timeSlot: data.timeSlot,
      reason: data.reason,
      createdBy: user.id
    });

    const [appointment] = await db.insert(appointments).values({
      patientId: data.patientId,
      doctorId: data.doctorId,
      hospitalId: data.hospitalId,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timeSlot: data.timeSlot,
      reason: data.reason,
      status: 'pending',
      type: data.type || 'online',
      priority: data.priority || 'normal',
      symptoms: data.symptoms || '',
      notes: data.notes || '',
      createdBy: user.id
      // createdAt will be set by database default
    }).returning();

    console.log(`✅ Appointment created: ${appointment.id}`);
    return appointment;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw new Error('Failed to create appointment');
  }
};

/**
 * Get all appointments assigned to a specific doctor.
 */
export const getAppointmentsByDoctor = async (doctorId: number) => {
  console.log(`📅 Fetching appointments for doctor ${doctorId}`);
  try {
    const result = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        hospitalId: appointments.hospitalId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        timeSlot: appointments.timeSlot,
        reason: appointments.reason,
        status: appointments.status,
        type: appointments.type,
        priority: appointments.priority,
        symptoms: appointments.symptoms,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        patientName: users.fullName,
        hospitalName: hospitals.name,
        doctorName: users.fullName
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(patients.userId, users.id))
      .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(desc(appointments.appointmentDate));

    console.log(`📋 Found ${result.length} appointments for doctor`);
    return result;
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    throw new Error('Failed to fetch appointments');
  }
};

/**
 * Get all appointments for a specific patient.
 */
export const getAppointmentsByPatient = async (patientId: number) => {
  console.log(`📅 Fetching appointments for patient ${patientId}`);
  try {
    const result = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        hospitalId: appointments.hospitalId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        timeSlot: appointments.timeSlot,
        reason: appointments.reason,
        status: appointments.status,
        type: appointments.type,
        priority: appointments.priority,
        symptoms: appointments.symptoms,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        doctorName: users.fullName,
        hospitalName: hospitals.name,
        doctorSpecialty: doctors.specialty
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.appointmentDate));

    console.log(`📋 Found ${result.length} appointments for patient`);
    return result;
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    throw new Error('Failed to fetch appointments');
  }
};

/**
 * Get all appointments for a specific hospital.
 */
export const getAppointmentsByHospital = async (hospitalId: number) => {
  console.log(`📅 Fetching appointments for hospital ${hospitalId}`);
  try {
    const result = await db
      .select({
        id: appointments.id,
        patientId: appointments.patientId,
        doctorId: appointments.doctorId,
        hospitalId: appointments.hospitalId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        timeSlot: appointments.timeSlot,
        reason: appointments.reason,
        status: appointments.status,
        type: appointments.type,
        priority: appointments.priority,
        symptoms: appointments.symptoms,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        patientName: users.fullName,
        doctorName: users.fullName,
        doctorSpecialty: doctors.specialty
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(patients.userId, users.id))
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(eq(appointments.hospitalId, hospitalId))
      .orderBy(desc(appointments.appointmentDate));

    console.log(`📋 Found ${result.length} appointments for hospital`);
    return result;
  } catch (error) {
    console.error('Error fetching hospital appointments:', error);
    throw new Error('Failed to fetch appointments');
  }
};

/**
 * Get appointment by ID.
 */
export const getAppointmentById = async (appointmentId: number) => {
  console.log(`📅 Fetching appointment ${appointmentId}`);
  try {
    const [result] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId));
    
    return result || null;
  } catch (error) {
    console.error('Error fetching appointment:', error);
    throw new Error('Failed to fetch appointment');
  }
};

/**
 * Update appointment status.
 */
export const updateAppointmentStatus = async (
  appointmentId: number, 
  status: string, 
  updatedBy?: number
) => {
  console.log(`📅 Updating appointment ${appointmentId} status to ${status}`);
  
  try {
    const [result] = await db
      .update(appointments)
      .set({
        status,
        updatedAt: new Date().toISOString()
      })
      .where(eq(appointments.id, appointmentId))
      .returning();
    
    if (!result) {
      throw new Error('Appointment not found');
    }
    
    console.log(`✅ Appointment ${appointmentId} status updated to ${status}`);
    return result;
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw new Error('Failed to update appointment status');
  }
};

/**
 * Cancel appointment.
 */
export const cancelAppointment = async (appointmentId: number, userId: number) => {
  console.log(`📅 Cancelling appointment ${appointmentId}`);
  
  try {
    const [result] = await db
      .update(appointments)
      .set({
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })
      .where(eq(appointments.id, appointmentId))
      .returning();
    
    if (!result) {
      throw new Error('Appointment not found');
    }
    
    console.log(`✅ Appointment ${appointmentId} cancelled`);
    return result;
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    throw new Error('Failed to cancel appointment');
  }
};

/**
 * Confirm appointment.
 */
export const confirmAppointment = async (appointmentId: number, userId: number) => {
  console.log(`📅 Confirming appointment ${appointmentId}`);
  
  try {
    const [result] = await db
      .update(appointments)
      .set({
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(appointments.id, appointmentId))
      .returning();
    
    if (!result) {
      throw new Error('Appointment not found');
    }
    
    console.log(`✅ Appointment ${appointmentId} confirmed`);
    return result;
  } catch (error) {
    console.error('Error confirming appointment:', error);
    throw new Error('Failed to confirm appointment');
  }
};

/**
 * Complete appointment.
 */
export const completeAppointment = async (appointmentId: number, userId: number) => {
  console.log(`📅 Completing appointment ${appointmentId}`);
  
  try {
    const [result] = await db
      .update(appointments)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(appointments.id, appointmentId))
      .returning();
    
    if (!result) {
      throw new Error('Appointment not found');
    }
    
    console.log(`✅ Appointment ${appointmentId} completed`);
    return result;
  } catch (error) {
    console.error('Error completing appointment:', error);
    throw new Error('Failed to complete appointment');
  }
};

/**
 * Get appointments by status.
 */
export const getAppointmentsByStatus = async (status: string) => {
  console.log(`📅 Fetching appointments with status: ${status}`);
  try {
    const result = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, status))
      .orderBy(desc(appointments.appointmentDate));
    
    console.log(`📋 Found ${result.length} appointments with status ${status}`);
    return result;
  } catch (error) {
    console.error('Error fetching appointments by status:', error);
    throw new Error('Failed to fetch appointments');
  }
};

/**
 * Get appointments by date range.
 */
export const getAppointmentsByDateRange = async (startDate: Date, endDate: Date) => {
  console.log(`📅 Fetching appointments from ${startDate} to ${endDate}`);
  try {
    const result = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.appointmentDate, startDate.toISOString().split('T')[0]),
          eq(appointments.appointmentDate, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(appointments.appointmentDate));
    
    console.log(`📋 Found ${result.length} appointments in date range`);
    return result;
  } catch (error) {
    console.error('Error fetching appointments by date range:', error);
    throw new Error('Failed to fetch appointments');
  }
};
