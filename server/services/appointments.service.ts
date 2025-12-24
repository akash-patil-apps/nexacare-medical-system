// server/services/appointments.service.ts
import { db } from '../db';
import { appointments, patients, doctors, hospitals, users } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
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
 * Get appointments for a specific doctor on a specific date (for slot availability)
 */
export const getAppointmentsByDoctorAndDate = async (doctorId: number, date: string) => {
  console.log(`📅 Fetching appointments for doctor ${doctorId} on date ${date}`);
  try {
    // Convert date string (YYYY-MM-DD) to Date object for comparison
    // The database stores appointmentDate as timestamp, so we need to compare dates properly
    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);
    
    const appointmentsData = await db
      .select({
        id: appointments.id,
        timeSlot: appointments.timeSlot,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          // Compare date part only (appointmentDate is stored as timestamp)
          sql`DATE(${appointments.appointmentDate}) = DATE(${sql.raw(`'${date}'`)})`,
          // Include all statuses (pending, confirmed, completed) to count bookings
          // Cancelled appointments don't count
          sql`${appointments.status} != 'cancelled'`
        )
      );

    console.log(`📋 Found ${appointmentsData.length} appointments for doctor ${doctorId} on ${date}`);
    return appointmentsData;
  } catch (error) {
    console.error('Error fetching appointments by doctor and date:', error);
    throw new Error('Failed to fetch appointments');
  }
};

/**
 * Get all appointments assigned to a specific doctor.
 */
export const getAppointmentsByDoctor = async (doctorId: number) => {
  console.log(`📅 Fetching appointments for doctor ${doctorId}`);
  try {
    // First, check ALL appointments for this doctor (including pending) for debugging
    const allAppointmentsForDoctor = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        doctorId: appointments.doctorId,
        appointmentDate: appointments.appointmentDate,
      })
      .from(appointments)
      .where(eq(appointments.doctorId, doctorId));
    
    console.log(`🔍 DEBUG: Found ${allAppointmentsForDoctor.length} total appointments for doctor ${doctorId} (all statuses)`);
    if (allAppointmentsForDoctor.length > 0) {
      console.log(`🔍 DEBUG: Appointment statuses:`, allAppointmentsForDoctor.map(a => ({ id: a.id, status: a.status, date: a.appointmentDate })));
    }
    
    // First get all appointments for this doctor with basic info
    const appointmentsData = await db
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
        confirmedAt: appointments.confirmedAt,
        completedAt: appointments.completedAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          // Doctor should see active/checked/completed states
          sql`${appointments.status} IN ('confirmed', 'checked-in', 'attended', 'checked', 'completed', 'cancelled')`
        )
      )
      .orderBy(desc(appointments.appointmentDate));

    console.log(`📋 Found ${appointmentsData.length} confirmed/completed appointments for doctor ${doctorId}`);

    // Now enrich with patient names, hospital names, and doctor names
    const enrichedAppointments = await Promise.all(
      appointmentsData.map(async (apt) => {
        // Get patient name
        const [patient] = await db
          .select({ userId: patients.userId })
          .from(patients)
          .where(eq(patients.id, apt.patientId))
          .limit(1);
        
        let patientName = 'Unknown Patient';
        if (patient) {
          const [patientUser] = await db
            .select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, patient.userId))
            .limit(1);
          if (patientUser) {
            patientName = patientUser.fullName;
          }
        }

        // Get hospital name
        const [hospital] = await db
          .select({ name: hospitals.name })
          .from(hospitals)
          .where(eq(hospitals.id, apt.hospitalId))
          .limit(1);
        
        const hospitalName = hospital?.name || 'Unknown Hospital';

        // Get doctor name (for verification)
        const [doctor] = await db
          .select({ userId: doctors.userId })
          .from(doctors)
          .where(eq(doctors.id, apt.doctorId))
          .limit(1);
        
        let doctorName = 'Unknown Doctor';
        if (doctor) {
          const [doctorUser] = await db
            .select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, doctor.userId))
            .limit(1);
          if (doctorUser) {
            doctorName = doctorUser.fullName;
          }
        }

        return {
          ...apt,
          patientName,
          hospitalName,
          doctorName,
        };
      })
    );

    console.log(`✅ Returning ${enrichedAppointments.length} enriched appointments for doctor ${doctorId}`);
    console.log(`📋 Sample appointments:`, enrichedAppointments.slice(0, 3).map(a => ({
      id: a.id,
      patient: a.patientName,
      status: a.status,
      date: a.appointmentDate
    })));
    
    return enrichedAppointments;
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    throw new Error('Failed to fetch appointments');
  }
};

/**
 * Get all appointments for a specific patient.
 * Shows all appointments including pending ones so patients can see their newly booked appointments.
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
        confirmedAt: appointments.confirmedAt,
        completedAt: appointments.completedAt,
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

    console.log(`📋 Found ${result.length} appointments for patient (including pending)`);
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
    // Get all appointments for the hospital with hospital name
    const appointmentsData = await db
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
        hospitalName: hospitals.name,
      })
      .from(appointments)
      .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
      .where(eq(appointments.hospitalId, hospitalId))
      .orderBy(desc(appointments.appointmentDate));

    console.log(`📋 Found ${appointmentsData.length} appointments for hospital`);

    // Enrich with patient and doctor information
    const enrichedAppointments = await Promise.all(
      appointmentsData.map(async (apt) => {
        // Get patient info
        const [patient] = await db
          .select({ userId: patients.userId })
          .from(patients)
          .where(eq(patients.id, apt.patientId))
          .limit(1);

        let patientName = 'Unknown Patient';
        if (patient) {
          const [patientUser] = await db
            .select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, patient.userId))
            .limit(1);
          if (patientUser) {
            patientName = patientUser.fullName;
          }
        }

        // Get doctor info
        const [doctor] = await db
          .select({ 
            userId: doctors.userId,
            specialty: doctors.specialty 
          })
          .from(doctors)
          .where(eq(doctors.id, apt.doctorId))
          .limit(1);

        let doctorName = 'Unknown Doctor';
        let doctorSpecialty = 'General';
        if (doctor) {
          doctorSpecialty = doctor.specialty || 'General';
          const [doctorUser] = await db
            .select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, doctor.userId))
            .limit(1);
          if (doctorUser) {
            doctorName = doctorUser.fullName;
          }
        }

        return {
          ...apt,
          patientName,
          doctorName,
          doctorSpecialty,
          hospitalName: apt.hospitalName || null,
        };
      })
    );

    console.log(`✅ Returning ${enrichedAppointments.length} enriched appointments`);
    return enrichedAppointments;
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
    const updateData: any = { status };
    
    // Set timestamp based on status using SQL NOW()
    if (status === 'confirmed') {
      updateData.confirmedAt = sql`NOW()`;
    } else if (status === 'completed') {
      updateData.completedAt = sql`NOW()`;
    }
    
    const [result] = await db
      .update(appointments)
      .set(updateData)
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
        status: 'cancelled'
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
        confirmedAt: sql`NOW()`
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
        completedAt: sql`NOW()`
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
 * Confirm appointment (for receptionist) - Approves pending appointments.
 * This makes the appointment visible to doctors and patients.
 */
export const confirmAppointmentByReceptionist = async (appointmentId: number, receptionistId: number) => {
  console.log(`📅 Receptionist ${receptionistId} confirming appointment ${appointmentId}`);
  
  try {
    // First verify appointment exists and is pending
    const [existingAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    
    if (!existingAppointment) {
      throw new Error('Appointment not found');
    }
    
    if (existingAppointment.status !== 'pending') {
      throw new Error(`Cannot confirm appointment. Current status: ${existingAppointment.status}. Only pending appointments can be confirmed.`);
    }
    
    console.log(`📋 Current appointment status: ${existingAppointment.status}`);
    
    // Update appointment status to confirmed
    // Use SQL NOW() for timestamp compatibility with PostgreSQL
    const [result] = await db
      .update(appointments)
      .set({
        status: 'confirmed',
        receptionistId,
        confirmedAt: sql`NOW()`
      })
      .where(eq(appointments.id, appointmentId))
      .returning();
    
    if (!result) {
      throw new Error('Failed to update appointment');
    }
    
    console.log(`✅ Appointment ${appointmentId} confirmed by receptionist. New status: ${result.status}`);
    console.log(`📋 Updated appointment:`, {
      id: result.id,
      status: result.status,
      receptionistId: result.receptionistId,
      confirmedAt: result.confirmedAt
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error confirming appointment:', error);
    throw error;
  }
};

/**
 * Check-in appointment (for receptionist) - Records when patient physically arrives at hospital.
 * This is different from "confirm" - check-in happens when patient arrives for their appointment.
 */
export const checkInAppointment = async (appointmentId: number, receptionistId: number) => {
  console.log(`📅 Receptionist ${receptionistId} checking in patient for appointment ${appointmentId}`);
  
  try {
    // First verify appointment exists and is confirmed
    const [existingAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    
    if (!existingAppointment) {
      throw new Error('Appointment not found');
    }
    
    if (existingAppointment.status !== 'confirmed') {
      throw new Error(`Cannot check in appointment. Current status: ${existingAppointment.status}. Only confirmed appointments can be checked in.`);
    }
    
    console.log(`📋 Current appointment status: ${existingAppointment.status}`);
    
    // Update appointment - change status to checked-in and add check-in timestamp in notes
    const checkInNote = `Patient checked in at ${new Date().toLocaleString()}`;
    const existingNotes = existingAppointment.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n${checkInNote}` : checkInNote;
    
    const [result] = await db
      .update(appointments)
      .set({
        status: 'checked-in',
        notes: updatedNotes,
        receptionistId
      })
      .where(eq(appointments.id, appointmentId))
      .returning();
    
    if (!result) {
      throw new Error('Failed to update appointment');
    }
    
    console.log(`✅ Patient checked in for appointment ${appointmentId}`);
    console.log(`📋 Updated appointment:`, {
      id: result.id,
      status: result.status,
      receptionistId: result.receptionistId,
      notes: result.notes
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error checking in appointment:', error);
    throw error;
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
