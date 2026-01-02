// server/services/appointments.service.ts
import { db } from '../db';
import { appointments, patients, doctors, hospitals, users, receptionists } from '../../drizzle/schema';
import { eq, and, desc, ne } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { InsertAppointment } from '../../shared/schema-types';
import { emitAppointmentChanged } from '../events/appointments.events';
import { createNotification } from './notifications.service';

/**
 * Book a new appointment.
 */
export const bookAppointment = async (
  data: Omit<InsertAppointment, 'id' | 'createdAt' | 'status'>,
  user: { id: number; mobileNumber: string; role: string; fullName: string }
) => {
  console.log(`📅 Creating appointment for patient ${data.patientId} with doctor ${data.doctorId}`);
  
  try {
    // Walk-in appointments are automatically confirmed (receptionist is confirming at booking time)
    const appointmentType = data.type || 'online';
    const isWalkIn = appointmentType === 'walk-in';

    const appointmentDayStr = (() => {
      const d = data.appointmentDate as any;
      if (typeof d === 'string') return d.slice(0, 10);
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      return String(d).slice(0, 10);
    })();

    const todayISTStr = (() => {
      const now = new Date();
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utcTime + 5.5 * 3600000);
      return ist.toISOString().slice(0, 10);
    })();

    // Best real-life logic:
    // - Walk-in for TODAY => patient is present => checked-in + token now
    // - Walk-in for FUTURE DATE => patient not present => confirmed (no token, no check-in)
    const isWalkInToday = isWalkIn && appointmentDayStr === todayISTStr;
    const initialStatus = isWalkIn ? (isWalkInToday ? 'checked-in' : 'confirmed') : 'pending';
    
    console.log('📅 Appointment data being inserted:', {
      patientId: data.patientId,
      doctorId: data.doctorId,
      hospitalId: data.hospitalId,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timeSlot: data.timeSlot,
      reason: data.reason,
      type: appointmentType,
      status: initialStatus,
      createdBy: user.id
    });

    const appointment = await db.transaction(async (tx) => {
      const appointmentValues: any = {
      patientId: data.patientId,
      doctorId: data.doctorId,
      hospitalId: data.hospitalId,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timeSlot: data.timeSlot,
      reason: data.reason,
        status: initialStatus,
        type: appointmentType,
      priority: data.priority || 'normal',
      symptoms: data.symptoms || '',
      notes: data.notes || '',
        createdBy: user.id,
      };

      // If receptionist is booking, also set receptionistId
      if (user.role === 'RECEPTIONIST') {
        const [receptionist] = await tx
          .select({ id: receptionists.id })
          .from(receptionists)
          .where(eq(receptionists.userId, user.id))
          .limit(1);
        if (receptionist) {
          appointmentValues.receptionistId = receptionist.id;
        }
      }

      // Walk-in: always set confirmedAt; only set checkedInAt + token when it is a walk-in for TODAY.
      if (isWalkIn) {
        appointmentValues.confirmedAt = sql`NOW()`;
        if (!isWalkInToday) {
          // Future walk-in booking: treat as confirmed schedule (no token, no check-in)
          const [created] = await tx.insert(appointments).values(appointmentValues).returning();
          return created;
        }

        appointmentValues.checkedInAt = sql`NOW()`;
        const dateStr = appointmentDayStr;

        // Concurrency-safe token assignment via unique index + retry
        for (let attempt = 0; attempt < 5; attempt++) {
          const maxTokenRow = await tx
            .select({
              maxToken: sql<number>`COALESCE(MAX(${appointments.tokenNumber}), 0)`,
            })
            .from(appointments)
            .where(
              and(
                eq(appointments.doctorId, data.doctorId),
                sql`DATE(${appointments.appointmentDate}) = DATE(${sql.raw(`'${dateStr}'`)})`,
              ),
            );

          const maxToken = maxTokenRow?.[0]?.maxToken ?? 0;
          const nextToken = maxToken + 1;
          appointmentValues.tokenNumber = nextToken;

          // Keep any existing notes; also add token marker so clients can parse as fallback
          const baseNotes = (appointmentValues.notes || '').toString();
          if (!/Token:\s*\d+/i.test(baseNotes)) {
            appointmentValues.notes = baseNotes ? `${baseNotes}\nToken: ${nextToken}` : `Token: ${nextToken}`;
          }

          try {
            const [created] = await tx.insert(appointments).values(appointmentValues).returning();
            return created;
          } catch (e: any) {
            const msg = String(e?.message || e);
            if (msg.includes('appointments_doctor_date_token_uq') || msg.toLowerCase().includes('duplicate')) {
              continue;
            }
            throw e;
          }
        }

        throw new Error('Failed to allocate token for walk-in. Please retry.');
      }

      // Non-walk-in: simple insert
      const [created] = await tx.insert(appointments).values(appointmentValues).returning();
      return created;
    });

    console.log(`✅ Appointment created: ${appointment.id} with status: ${appointment.status}`);
    await emitAppointmentChanged(
      appointment.id,
      isWalkIn ? (isWalkInToday ? "checked-in" : "confirmed") : "created"
    );
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
        tokenNumber: appointments.tokenNumber,
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
        tokenNumber: appointments.tokenNumber,
        checkedInAt: appointments.checkedInAt,
        rescheduledAt: appointments.rescheduledAt,
        rescheduledFromDate: appointments.rescheduledFromDate,
        rescheduledFromTimeSlot: appointments.rescheduledFromTimeSlot,
        rescheduleReason: appointments.rescheduleReason,
        rescheduledBy: appointments.rescheduledBy,
        createdAt: appointments.createdAt,
        confirmedAt: appointments.confirmedAt,
        completedAt: appointments.completedAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          // Doctor should see active/checked/completed states
          sql`${appointments.status} IN ('confirmed', 'checked-in', 'in_consultation', 'attended', 'checked', 'completed', 'cancelled')`
        )
      )
      .orderBy(desc(appointments.appointmentDate));

    console.log(`📋 Found ${appointmentsData.length} confirmed/completed appointments for doctor ${doctorId}`);

    // Now enrich with patient names, hospital names, and doctor names
    const enrichedAppointments = await Promise.all(
      appointmentsData.map(async (apt) => {
        // Get patient name, phone, DOB, blood group
        const [patient] = await db
          .select({ 
            userId: patients.userId,
            dateOfBirth: patients.dateOfBirth,
            bloodGroup: patients.bloodGroup,
          })
          .from(patients)
          .where(eq(patients.id, apt.patientId))
          .limit(1);
        
        let patientName = 'Unknown Patient';
        let patientDateOfBirth = null;
        let patientBloodGroup: string | null = null;
        let patientPhone: string | null = null;
        if (patient) {
          patientDateOfBirth = patient.dateOfBirth;
          patientBloodGroup = patient.bloodGroup ?? null;
          const [patientUser] = await db
            .select({ fullName: users.fullName, mobileNumber: users.mobileNumber })
            .from(users)
            .where(eq(users.id, patient.userId))
            .limit(1);
          if (patientUser) {
            patientName = patientUser.fullName;
            patientPhone = patientUser.mobileNumber;
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
          patientDateOfBirth,
          patientBloodGroup,
          patientPhone,
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
    const baseSelect = {
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
      tokenNumber: appointments.tokenNumber,
      checkedInAt: appointments.checkedInAt,
      createdAt: appointments.createdAt,
      confirmedAt: appointments.confirmedAt,
      completedAt: appointments.completedAt,
      doctorName: users.fullName,
      hospitalName: hospitals.name,
      doctorSpecialty: doctors.specialty,
    } as const;

    // Try selecting reschedule fields; if DB doesn't have them, fall back to baseSelect.
    let result: any[] = [];
    try {
      result = await db
        .select({
          ...baseSelect,
          rescheduledAt: appointments.rescheduledAt,
          rescheduledFromDate: appointments.rescheduledFromDate,
          rescheduledFromTimeSlot: appointments.rescheduledFromTimeSlot,
          rescheduleReason: appointments.rescheduleReason,
          rescheduledBy: appointments.rescheduledBy,
        })
        .from(appointments)
        .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
        .leftJoin(users, eq(doctors.userId, users.id))
        .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
        .where(eq(appointments.patientId, patientId))
        .orderBy(desc(appointments.appointmentDate));
    } catch (e: any) {
      const msg = String(e?.cause?.message || e?.message || e);
      if (msg.includes('rescheduled_at') || msg.includes('42703')) {
        console.warn('⚠️ Reschedule columns missing in DB; falling back to base appointments select for patient.');
        result = await db
          .select(baseSelect)
          .from(appointments)
          .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
          .leftJoin(users, eq(doctors.userId, users.id))
          .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
          .where(eq(appointments.patientId, patientId))
          .orderBy(desc(appointments.appointmentDate));
      } else {
        throw e;
      }
    }

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
    const baseSelect = {
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
      tokenNumber: appointments.tokenNumber,
      checkedInAt: appointments.checkedInAt,
      createdAt: appointments.createdAt,
      hospitalName: hospitals.name,
    } as const;

    let appointmentsData: any[] = [];
    try {
      appointmentsData = await db
        .select({
          ...baseSelect,
          rescheduledAt: appointments.rescheduledAt,
          rescheduledFromDate: appointments.rescheduledFromDate,
          rescheduledFromTimeSlot: appointments.rescheduledFromTimeSlot,
          rescheduleReason: appointments.rescheduleReason,
          rescheduledBy: appointments.rescheduledBy,
        })
        .from(appointments)
        .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
        .where(eq(appointments.hospitalId, hospitalId))
        .orderBy(desc(appointments.appointmentDate));
    } catch (e: any) {
      const msg = String(e?.cause?.message || e?.message || e);
      if (msg.includes('rescheduled_at') || msg.includes('42703')) {
        console.warn('⚠️ Reschedule columns missing in DB; falling back to base appointments select for hospital.');
        appointmentsData = await db
          .select(baseSelect)
          .from(appointments)
          .leftJoin(hospitals, eq(appointments.hospitalId, hospitals.id))
          .where(eq(appointments.hospitalId, hospitalId))
          .orderBy(desc(appointments.appointmentDate));
      } else {
        throw e;
      }
    }

    console.log(`📋 Found ${appointmentsData.length} appointments for hospital`);

    // Enrich with patient and doctor information
    const enrichedAppointments = await Promise.all(
      appointmentsData.map(async (apt) => {
        // Get patient info including dateOfBirth, bloodGroup
        const [patient] = await db
          .select({ 
            userId: patients.userId,
            dateOfBirth: patients.dateOfBirth,
            bloodGroup: patients.bloodGroup,
          })
          .from(patients)
          .where(eq(patients.id, apt.patientId))
          .limit(1);

        let patientName = 'Unknown Patient';
        let patientDateOfBirth = null;
        let patientBloodGroup: string | null = null;
        let patientPhone: string | null = null;
        if (patient) {
          patientDateOfBirth = patient.dateOfBirth;
          patientBloodGroup = patient.bloodGroup ?? null;
          const [patientUser] = await db
            .select({ fullName: users.fullName, mobileNumber: users.mobileNumber })
            .from(users)
            .where(eq(users.id, patient.userId))
            .limit(1);
          if (patientUser) {
            patientName = patientUser.fullName;
            patientPhone = patientUser.mobileNumber;
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
          patientDateOfBirth,
          patientBloodGroup,
          patientPhone,
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
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
      if (!existing) throw new Error('Appointment not found');

    const updateData: any = { status };
    
    // Set timestamp based on status using SQL NOW()
    if (status === 'confirmed') {
      updateData.confirmedAt = sql`NOW()`;
    } else if (status === 'completed') {
      updateData.completedAt = sql`NOW()`;
    }
    
      // If doctor starts consultation (or someone sets checked-in) and token is missing, allocate token.
      const shouldAllocateToken = (status === 'in_consultation' || status === 'checked-in') && !(existing as any).tokenNumber;
      if (shouldAllocateToken) {
        const maxTokenRow = await tx
          .select({
            maxToken: sql<number>`COALESCE(MAX(${appointments.tokenNumber}), 0)`,
          })
          .from(appointments)
          .where(
            and(
              eq(appointments.doctorId, existing.doctorId),
              sql`DATE(${appointments.appointmentDate}) = DATE(${existing.appointmentDate})`,
            ),
          );

        const maxToken = maxTokenRow?.[0]?.maxToken ?? 0;
        const nextToken = maxToken + 1;
        updateData.tokenNumber = nextToken;
        updateData.checkedInAt = (existing as any).checkedInAt ? (existing as any).checkedInAt : sql`NOW()`;

        const existingNotes = (existing as any).notes || '';
        if (!/Token:\s*\d+/i.test(existingNotes)) {
          const note = `Token: ${nextToken}`;
          updateData.notes = existingNotes ? `${existingNotes}\n${note}` : note;
        }
      }

      const [updated] = await tx.update(appointments).set(updateData).where(eq(appointments.id, appointmentId)).returning();
      if (!updated) throw new Error('Appointment not found');
      return updated;
    });
    
    if (!result) throw new Error('Appointment not found');
    
    console.log(`✅ Appointment ${appointmentId} status updated to ${status}`);
    await emitAppointmentChanged(result.id, "status-updated");
    return result;
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw new Error('Failed to update appointment status');
  }
};

/**
 * Cancel appointment.
 */
export const cancelAppointment = async (appointmentId: number, userId: number, cancellationReason?: string) => {
  console.log(`📅 Cancelling appointment ${appointmentId}${cancellationReason ? ` with reason: ${cancellationReason}` : ''}`);
  
  try {
    // First get the existing appointment to preserve notes
    const [existingAppointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    
    if (!existingAppointment) {
      throw new Error('Appointment not found');
    }
    
    const updateData: any = {
      status: 'cancelled'
    };
    
    // Store cancellation reason in notes field
    if (cancellationReason) {
      const currentNotes = existingAppointment.notes || '';
      const cancellationNote = `Cancellation Reason: ${cancellationReason}`;
      updateData.notes = currentNotes ? `${currentNotes}\n${cancellationNote}` : cancellationNote;
    }
    
    const [result] = await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, appointmentId))
      .returning();
    
    if (!result) {
      throw new Error('Failed to update appointment');
    }
    
    console.log(`✅ Appointment ${appointmentId} cancelled${cancellationReason ? ` with reason: ${cancellationReason}` : ''}`);
    await emitAppointmentChanged(result.id, "cancelled");
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
    await emitAppointmentChanged(result.id, "confirmed");
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
    await emitAppointmentChanged(result.id, "completed");
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
    
    await emitAppointmentChanged(result.id, "confirmed");
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
    const result = await db.transaction(async (tx) => {
      // First verify appointment exists and is eligible for token assignment
      const [existingAppointment] = await tx
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    
    if (!existingAppointment) {
      throw new Error('Appointment not found');
    }
    
      const eligibleStatuses = new Set(['confirmed', 'checked-in', 'attended', 'in_consultation']);
      if (!eligibleStatuses.has((existingAppointment.status || '').toString())) {
        throw new Error(
          `Cannot check in appointment. Current status: ${existingAppointment.status}. Only confirmed/checked-in appointments can be checked in.`,
        );
      }

      // If already tokened (shouldn't happen if status is confirmed, but safe), keep idempotent.
      if ((existingAppointment as any).tokenNumber) {
        return existingAppointment as any;
      }

      // Allocate next token for the same doctor on the same appointment date.
      // Concurrency-safe via unique index + retries.
      const existingStatus = (existingAppointment.status || '').toString();
      const existingNotes = (existingAppointment as any).notes || '';

      for (let attempt = 0; attempt < 5; attempt++) {
        const maxTokenRow = await tx
          .select({
            maxToken: sql<number>`COALESCE(MAX(${appointments.tokenNumber}), 0)`,
          })
          .from(appointments)
          .where(
            and(
              eq(appointments.doctorId, existingAppointment.doctorId),
              sql`DATE(${appointments.appointmentDate}) = DATE(${existingAppointment.appointmentDate})`,
            ),
          );

        const maxToken = maxTokenRow?.[0]?.maxToken ?? 0;
        const nextToken = maxToken + 1;

        const checkInNote = `Patient checked in at ${new Date().toLocaleString()} (Token: ${nextToken})`;
        const updatedNotes =
          existingNotes && /Token:\s*\d+/i.test(existingNotes) ? existingNotes : (existingNotes ? `${existingNotes}\n${checkInNote}` : checkInNote);

        try {
          const [updated] = await tx
      .update(appointments)
      .set({
              // If we're coming from confirmed, set checked-in; otherwise keep current status (backfill token).
              status: existingStatus === 'confirmed' ? 'checked-in' : existingStatus,
        notes: updatedNotes,
              receptionistId,
              tokenNumber: nextToken,
              checkedInAt: (existingAppointment as any).checkedInAt ? (existingAppointment as any).checkedInAt : sql`NOW()`,
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

          if (!updated) {
            throw new Error('Failed to update appointment');
          }

          return updated as any;
        } catch (e: any) {
          const msg = String(e?.message || e);
          // If token unique index collides due to concurrent check-in, retry.
          if (msg.includes('appointments_doctor_date_token_uq') || msg.toLowerCase().includes('duplicate')) {
            continue;
          }
          throw e;
        }
      }

      throw new Error('Failed to allocate token. Please try again.');
    });
    
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
    
    await emitAppointmentChanged(result.id, "checked-in");
    return result;
  } catch (error) {
    console.error('❌ Error checking in appointment:', error);
    throw error;
  }
};

/**
 * Reschedule appointment (v1) - receptionist-driven.
 *
 * Real-life model:
 * - Receptionist changes date/time when doctor is unavailable or patient requests changes.
 * - If moved to a different day, token/check-in are reset (new queue day).
 * - If moved within the same day and the patient is already checked-in, we keep token.
 */
export const rescheduleAppointment = async (
  appointmentId: number,
  input: {
    appointmentDate: string; // YYYY-MM-DD (preferred) or ISO string; stored in timestamp column
    appointmentTime: string; // HH:mm
    timeSlot: string; // HH:mm-HH:mm
    rescheduleReason: string;
  },
  actor: { userId: number; receptionistId?: number }
) => {
  const { appointmentDate, appointmentTime, timeSlot, rescheduleReason } = input;
  if (!appointmentDate || !appointmentTime || !timeSlot) {
    throw new Error('Missing required fields for reschedule');
  }

  const reason = (rescheduleReason || '').trim();
  if (!reason) throw new Error('Reschedule reason is required');

  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
    if (!existing) throw new Error('Appointment not found');

    const currentStatus = (existing.status || '').toString();
    if (currentStatus === 'cancelled' || currentStatus === 'completed') {
      throw new Error(`Cannot reschedule an appointment with status: ${currentStatus}`);
    }
    if (currentStatus === 'in_consultation') {
      throw new Error('Cannot reschedule while consultation is in progress');
    }

    // Conflict check: same doctor + same date + same timeSlot, excluding this appointment and cancelled.
    const conflicts = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, existing.doctorId),
          sql`DATE(${appointments.appointmentDate}) = DATE(${sql.raw(`'${appointmentDate.slice(0, 10)}'`)})`,
          eq(appointments.timeSlot, timeSlot),
          ne(appointments.id, appointmentId),
          sql`${appointments.status} != 'cancelled'`,
        ),
      )
      .limit(1);

    if (conflicts.length > 0) {
      throw new Error('Selected slot is already booked for this doctor');
    }

    const oldDateStr = String((existing as any).appointmentDate || '').slice(0, 10);
    const newDateStr = String(appointmentDate).slice(0, 10);
    const sameDay = oldDateStr && newDateStr && oldDateStr === newDateStr;

    const updateData: any = {
      appointmentDate,
      appointmentTime,
      timeSlot,
      rescheduledAt: sql`NOW()`,
      rescheduledFromDate: (existing as any).appointmentDate,
      rescheduledFromTimeSlot: (existing as any).timeSlot,
      rescheduleReason: reason,
      rescheduledBy: actor.userId,
    };

    // Attach receptionistId if provided (audit)
    if (actor.receptionistId) {
      updateData.receptionistId = actor.receptionistId;
    }

    // Token handling: if changing day, reset queue-related fields and status
    if (!sameDay) {
      updateData.tokenNumber = null;
      updateData.checkedInAt = null;
      // If patient was already checked-in/attended, move back to confirmed for the new day.
      if (currentStatus === 'checked-in' || currentStatus === 'attended') {
        updateData.status = 'confirmed';
        updateData.confirmedAt = sql`NOW()`;
      }
    }

    const oldSlot = (existing as any).timeSlot || '';
    const baseNotes = ((existing as any).notes || '').toString();
    const rescheduleNote = `Rescheduled: ${oldDateStr} ${oldSlot} -> ${newDateStr} ${timeSlot}. Reason: ${reason}`;
    updateData.notes = baseNotes ? `${baseNotes}\n${rescheduleNote}` : rescheduleNote;

    const [updated] = await tx.update(appointments).set(updateData).where(eq(appointments.id, appointmentId)).returning();
    if (!updated) throw new Error('Failed to reschedule appointment');

    await emitAppointmentChanged((updated as any).id, 'rescheduled');
    return updated;
  });

  // Notify patient + doctor (in-app notifications stored in DB)
  // Best-effort: reschedule should succeed even if notification write fails.
  try {
    const [patientRow] = await db
      .select({ userId: patients.userId })
      .from(patients)
      .where(eq(patients.id, (updated as any).patientId))
      .limit(1);
    const [doctorRow] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, (updated as any).doctorId))
      .limit(1);

    const newDay = String(input.appointmentDate).slice(0, 10);
    const title = 'Appointment Rescheduled';
    const msg = `Your appointment has been rescheduled to ${newDay} (${input.timeSlot}). Reason: ${reason}`;

    if (patientRow?.userId) {
      await createNotification({
        userId: patientRow.userId,
        type: 'appointment_rescheduled',
        title,
        message: msg,
        relatedId: (updated as any).id,
        relatedType: 'appointment',
      });
    }

    if (doctorRow?.userId) {
      await createNotification({
        userId: doctorRow.userId,
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled (Patient)',
        message: `An appointment has been rescheduled to ${newDay} (${input.timeSlot}).`,
        relatedId: (updated as any).id,
        relatedType: 'appointment',
      });
    }
  } catch (e) {
    console.warn('⚠️ Failed to create reschedule notifications:', e);
  }

  return updated;
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
