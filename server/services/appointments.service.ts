// server/services/appointments.service.ts
import { db } from '../db';
import { retryDbOperation } from '../utils/db-retry';
import { appointments, patients, doctors, hospitals, users, receptionists, invoices } from '../../shared/schema';
import { eq, and, desc, ne } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { InsertAppointment } from '../../shared/schema';
import { emitAppointmentChanged } from '../events/appointments.events';
import { createNotification } from './notifications.service';
import { smsService } from './sms.service';
import { emailService } from './email.service';
import * as billingService from './billing.service';
import { logAuditEvent } from './audit.service';
import * as queueService from './queue.service';
import {
  getSlotKeyFromAppointment,
  formatTokenIdentifier,
  getMaxPatientsPerSlot,
  type SlotKey,
} from './opd-token';

/** Parse appointmentTime (e.g. "09:00", "14:30", "02:30 PM") to minutes since midnight for ordering. */
function parseAppointmentTimeToMinutes(t: string | null | undefined): number {
  const s = (t || '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (/pm/i.test(s) && h < 12) h += 12;
  if (/am/i.test(s) && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * Next sequence number for a slot (doctor/date/slotKey). Used to assign token_identifier at book time.
 * Counts existing appointments in same slot; returns min(count+1, maxPatientsPerSlot).
 */
async function getNextSeqForSlot(
  dbOrTx: typeof db,
  doctorId: number,
  dateStr: string,
  slotKey: SlotKey
): Promise<number> {
  const rows = await dbOrTx
    .select({
      appointmentTime: appointments.appointmentTime,
      timeSlot: appointments.timeSlot,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        sql`DATE(${appointments.appointmentDate}) = ${sql.raw(`'${dateStr}'::date`)}`,
        sql`${appointments.status} != 'cancelled'`,
      ),
    );
  const inSlot = rows.filter((r) => {
    const key = getSlotKeyFromAppointment(r.appointmentTime, r.timeSlot);
    return key.hour === slotKey.hour && key.half === slotKey.half;
  });
  const maxPerSlot = getMaxPatientsPerSlot(doctorId, dateStr);
  return Math.min(inSlot.length + 1, maxPerSlot);
}

/**
 * Book a new appointment.
 */
export const bookAppointment = async (
  data: Omit<InsertAppointment, 'id' | 'createdAt' | 'status'>,
  user: { id: number; mobileNumber: string; role: string; fullName: string }
) => {
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

    // Spec: booking alone never inserts into active queue. Walk-in today = confirmed only; check-in adds to queue.
    const initialStatus = isWalkIn ? 'confirmed' : 'pending';

    const appointment = await db.transaction(async (tx) => {
      // Convert appointmentDate to Date object if it's a string
      // Drizzle timestamp columns require Date objects, not strings
      let appointmentDateValue: Date;
      if (data.appointmentDate instanceof Date) {
        appointmentDateValue = data.appointmentDate;
      } else if (typeof data.appointmentDate === 'string') {
        // Handle different date string formats
        const dateStr = data.appointmentDate.trim();
        // If it's just a date (YYYY-MM-DD), add time to make it a valid Date
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          appointmentDateValue = new Date(dateStr + 'T00:00:00');
        } else {
          appointmentDateValue = new Date(dateStr);
        }
        if (isNaN(appointmentDateValue.getTime())) {
          throw new Error(`Invalid appointment date format: ${data.appointmentDate}`);
        }
      } else {
        throw new Error(`appointmentDate must be a Date object or valid date string, got: ${typeof data.appointmentDate}`);
      }

      // Validate required fields (appointmentTime and timeSlot are NOT NULL in schema)
      if (!data.appointmentTime || !data.timeSlot || !data.reason) {
        throw new Error(`Missing required fields: ${!data.appointmentTime ? 'appointmentTime ' : ''}${!data.timeSlot ? 'timeSlot ' : ''}${!data.reason ? 'reason' : ''}`);
      }

      // Assign stable token_identifier at book time (all bookings: online and walk-in)
      const slotKey = getSlotKeyFromAppointment(data.appointmentTime, data.timeSlot);
      const nextSeq = await getNextSeqForSlot(tx, data.doctorId, appointmentDayStr, slotKey);
      const tokenIdentifier = formatTokenIdentifier(slotKey, nextSeq);

      const appointmentValues: any = {
        patientId: data.patientId,
        doctorId: data.doctorId,
        hospitalId: data.hospitalId,
        appointmentDate: appointmentDateValue,
        appointmentTime: data.appointmentTime,
        timeSlot: data.timeSlot,
        reason: data.reason,
        status: initialStatus,
        type: appointmentType,
        priority: data.priority || 'normal',
        symptoms: data.symptoms || '',
        notes: data.notes || '',
        createdBy: user.id,
        tokenIdentifier,
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

      // Walk-in: confirmed at booking; patient enters queue only after check-in (no auto check-in)
      if (isWalkIn) {
        appointmentValues.confirmedAt = sql`NOW()`;
        const [created] = await tx.insert(appointments).values(appointmentValues).returning();
        return created;
      }

      // Online: insert with token_identifier; confirmation and check-in are separate steps
      try {
      const [created] = await tx.insert(appointments).values(appointmentValues).returning();
      return created;
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        // Check for common database constraint violations
        if (errorMsg.includes('violates') || errorMsg.includes('constraint') || errorMsg.includes('foreign key')) {
          throw new Error(`Database constraint violation: ${errorMsg}`);
        }
        throw new Error(`Failed to create appointment: ${errorMsg}`);
      }
    });

    // Notify receptionists when a patient creates a PENDING appointment (so they can confirm)
    // Best-effort: appointment booking must succeed even if notification fails.
    try {
      const isOnlinePending = !isWalkIn && initialStatus === 'pending';
      console.log(`🔔 Notification check: isWalkIn=${isWalkIn}, initialStatus=${initialStatus}, isOnlinePending=${isOnlinePending}`);
      
      if (isOnlinePending) {
        const [patientRow] = await db
          .select({ userId: patients.userId })
          .from(patients)
          .where(eq(patients.id, data.patientId))
          .limit(1);
        
        const patientUser = patientRow?.userId
          ? (await db
              .select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, patientRow.userId))
              .limit(1))[0]
          : null;
        const patientName = patientUser?.fullName || 'Patient';

        const day = appointmentDayStr;
        const slot = String(data.timeSlot || '').trim();
        const title = 'New Pending Appointment';
        const message = `${patientName} booked ${day} (${slot}). Please confirm or reject.`;

        console.log(`🔔 Creating notifications for hospital ${data.hospitalId}, appointment ${appointment.id}`);
        const receptionistUsers = await db
          .select({ userId: receptionists.userId })
          .from(receptionists)
          .where(eq(receptionists.hospitalId, data.hospitalId))
          .limit(50);

        console.log(`🔔 Found ${receptionistUsers.length} receptionists for hospital ${data.hospitalId}`);

        const notificationResults = await Promise.all(
          receptionistUsers
            .map((r) => r.userId)
            .filter(Boolean)
            .map(async (uid) => {
              try {
                const result = await createNotification({
                  userId: uid as number,
                  type: 'appointment_pending',
                  title,
                  message,
                  relatedId: appointment.id,
                  relatedType: 'appointment',
                });
                console.log(`✅ Created notification for receptionist userId ${uid}, notification ID: ${result[0]?.id}`);
                return result;
              } catch (err) {
                console.error(`❌ Failed to create notification for receptionist userId ${uid}:`, err);
                throw err;
              }
            }),
        );
        console.log(`🔔 Successfully created ${notificationResults.length} notifications`);
      } else {
        console.log(`🔔 Skipping notification: appointment is not online pending (isWalkIn=${isWalkIn}, status=${initialStatus})`);
      }
    } catch (e) {
      console.error('⚠️ Failed to create receptionist pending notifications:', e);
      // Don't throw - appointment booking should succeed even if notification fails
    }

    // Auto-create invoice and payment record for online payments
    // Check appointment notes for online payment indicators
    const appointmentNotes = appointment.notes || '';
    const onlinePaymentMethods = ['googlepay', 'phonepe', 'card'];
    const paymentMethodMatch = appointmentNotes.match(/Method:\s*([^|]+)/i);
    const paymentMethod = paymentMethodMatch?.[1]?.trim().toLowerCase();
    const hasPaymentInfo = appointmentNotes.includes('Payment:') || appointmentNotes.includes('Amount:');
    
    // Check if this is an online payment (has payment method in notes and payment info)
    if (hasPaymentInfo && paymentMethod && onlinePaymentMethods.includes(paymentMethod)) {
      try {
        console.log('💳 Auto-creating invoice for online payment appointment:', appointment.id);
        
        // Create invoice automatically - billing service will extract payment from notes
        const invoice = await billingService.createInvoice({
          hospitalId: data.hospitalId,
          patientId: data.patientId,
          appointmentId: appointment.id,
          actorUserId: user.id,
          actorRole: user.role || 'PATIENT',
        });
        
        // Invoice and payment record created automatically for online payment
      } catch (invoiceError) {
        // Log error but don't fail appointment booking
        console.error('⚠️ Failed to auto-create invoice for online payment:', invoiceError);
        // Appointment booking should still succeed even if invoice creation fails
      }
    }

    await emitAppointmentChanged(
      appointment.id,
      isWalkIn ? 'confirmed' : 'created',
    );
    return appointment;
  } catch (error) {
    console.error('Error creating appointment:', error);
    // Preserve the original error message for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    throw new Error(`Failed to create appointment: ${errorMessage}`);
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
        tokenIdentifier: appointments.tokenIdentifier,
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
        
        if (patient && patient.userId) {
          patientDateOfBirth = patient.dateOfBirth;
          patientBloodGroup = patient.bloodGroup ?? null;
          const [patientUser] = await db
            .select({ fullName: users.fullName, mobileNumber: users.mobileNumber })
            .from(users)
            .where(eq(users.id, patient.userId))
            .limit(1);
          if (patientUser && patientUser.fullName) {
            patientName = patientUser.fullName;
            patientPhone = patientUser.mobileNumber || null;
          } else {
            console.warn(`⚠️ Patient user not found for patientId ${apt.patientId}, userId ${patient.userId}`);
          }
        } else {
          console.warn(`⚠️ Patient not found for appointment ${apt.id}, patientId ${apt.patientId}`);
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
      tokenIdentifier: appointments.tokenIdentifier,
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
  try {
    return await retryDbOperation(async () => {
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
      tokenIdentifier: appointments.tokenIdentifier,
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

    // Backfill token_identifier for existing appointments that have null (e.g. created before new OPD spec)
    const needBackfill = appointmentsData.filter(
      (a: any) => !a.tokenIdentifier && a.timeSlot && a.status !== 'cancelled',
    );
    if (needBackfill.length > 0) {
      const dateStr = (d: any) =>
        d instanceof Date ? d.toISOString().slice(0, 10) : String(d || '').slice(0, 10);
      const byGroup = new Map<string, typeof needBackfill>();
      for (const a of needBackfill) {
        const key = `${a.doctorId}|${dateStr(a.appointmentDate)}|${getSlotKeyFromAppointment(a.appointmentTime, a.timeSlot).hour}|${getSlotKeyFromAppointment(a.appointmentTime, a.timeSlot).half}`;
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key)!.push(a);
      }
      for (const group of byGroup.values()) {
        const sorted = [...group].sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime() || a.id - b.id,
        );
        const maxPerSlot = getMaxPatientsPerSlot(sorted[0].doctorId, dateStr(sorted[0].appointmentDate));
        for (let i = 0; i < sorted.length; i++) {
          const apt = sorted[i];
          const slotKey = getSlotKeyFromAppointment(apt.appointmentTime, apt.timeSlot);
          const tokenIdentifier = formatTokenIdentifier(slotKey, Math.min(i + 1, maxPerSlot));
          (apt as any).tokenIdentifier = tokenIdentifier;
          await db.update(appointments).set({ tokenIdentifier }).where(eq(appointments.id, apt.id));
        }
      }
    }

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

    return enrichedAppointments;
    }, { maxRetries: 2 }); // 2 retries (3 attempts total) on ETIMEDOUT/ECONNRESET
  } catch (error) {
    console.error('Error fetching hospital appointments:', error);
    throw new Error('Failed to fetch appointments');
  }
};

/**
 * Get appointment by ID with related doctor and patient information.
 */
export const getAppointmentById = async (appointmentId: number) => {
  console.log(`📅 Fetching appointment ${appointmentId}`);
  try {
    // Get appointment with doctor and patient info
    const result = await db
      .select({
        appointment: appointments,
        doctor: doctors,
        patient: patients,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    
    if (result.length === 0) {
      return null;
    }
    
    const row = result[0];
    
    // Fetch doctor user info if doctor exists
    let doctorUser = null;
    if (row.doctor?.userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, row.doctor.userId))
        .limit(1);
      doctorUser = user || null;
    }
    
    // Fetch patient user info if patient exists
    let patientUser = null;
    if (row.patient?.userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, row.patient.userId))
        .limit(1);
      patientUser = user || null;
    }
    
    // Format the response to include doctor and patient info
    return {
      ...row.appointment,
      doctor: row.doctor ? {
        id: row.doctor.id,
        specialty: row.doctor.specialty,
        consultationFee: row.doctor.consultationFee,
        fullName: doctorUser?.fullName || null,
      } : null,
      patient: row.patient ? {
        id: row.patient.id,
        fullName: patientUser?.fullName || null,
        mobileNumber: patientUser?.mobileNumber || null,
      } : null,
      doctorName: doctorUser?.fullName || null,
      doctorSpecialty: row.doctor?.specialty || null,
      patientName: patientUser?.fullName || null,
      patientMobile: patientUser?.mobileNumber || null,
    };
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
    
      // Legacy: if status is checked-in/in_consultation and no token_identifier, set checkedInAt (token is assigned at book or on check-in)
      if ((status === 'in_consultation' || status === 'checked-in') && !(existing as any).checkedInAt) {
        updateData.checkedInAt = sql`NOW()`;
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
 * Parse appointment start time from date and time slot
 */
function parseAppointmentStartTime(appointmentDate: Date | string, timeSlot: string | null): Date | null {
  try {
    const date = appointmentDate instanceof Date ? appointmentDate : new Date(appointmentDate);
    if (isNaN(date.getTime())) return null;
    
    if (!timeSlot) return null;
    
    // Parse time slot (e.g., "02:00-02:30", "02:00 PM", "14:00")
    const startPart = timeSlot.includes('-') ? timeSlot.split('-')[0].trim() : timeSlot.trim();
    const match = startPart.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/);
    
    if (!match) return null;
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    
    // Handle 12-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    // Legacy convention: "02:00-05:00" slots represent AFTERNOON when AM/PM is missing
    if (!period && hours >= 2 && hours <= 5) {
      hours += 12;
    }
    
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    
    return startTime;
  } catch (error) {
    console.error('Error parsing appointment start time:', error);
    return null;
  }
}

/**
 * Cancel appointment.
 * - Patients can cancel appointments BEFORE receptionist confirmation (full refund)
 * - Patients can cancel appointments AFTER receptionist confirmation (10% cancellation fee, 90% refund)
 *
 * `auditContext` is optional metadata about who performed the action and from where.
 */
export const cancelAppointment = async (
  appointmentId: number,
  userId: number,
  cancellationReason?: string,
  auditContext?: {
    actorRole?: string;
    ipAddress?: string;
    userAgent?: string;
  }
) => {
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
    
    // Check if appointment is already cancelled
    if (existingAppointment.status === 'cancelled') {
      throw new Error('Appointment is already cancelled');
    }
    
    // Check if appointment has already started or passed
    const appointmentStartTime = parseAppointmentStartTime(
      existingAppointment.appointmentDate,
      existingAppointment.timeSlot
    );
    
    if (appointmentStartTime) {
      const now = new Date();
      if (appointmentStartTime.getTime() < now.getTime()) {
        throw new Error('Cannot cancel appointment that has already started or passed');
      }
    }
    
    // Check if appointment is confirmed (has confirmedAt timestamp)
    const isConfirmed = !!existingAppointment.confirmedAt;
    
    // Process refund if payment exists
    let refundInfo: { refundAmount: number; cancellationFee: number } | null = null;
    
    if (isConfirmed) {
      // After confirmation: 10% cancellation fee, 90% refund
      try {
        // Find invoice for this appointment
        const [invoice] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.appointmentId, appointmentId))
          .limit(1);
        
        if (invoice) {
          const paidAmount = parseFloat(invoice.paidAmount || '0');
          if (paidAmount > 0) {
            const cancellationFee = Math.round(paidAmount * 0.1 * 100) / 100; // 10% fee, rounded to 2 decimals
            const refundAmount = paidAmount - cancellationFee;
            
            if (refundAmount > 0) {
              // Process refund
              await billingService.processRefund({
                invoiceId: invoice.id,
                amount: refundAmount,
                reason: `Appointment cancellation after confirmation. 10% cancellation fee applied. ${cancellationReason ? `Reason: ${cancellationReason}` : ''}`,
                processedByUserId: userId,
                actorUserId: userId,
                actorRole: 'PATIENT',
              });
              
              refundInfo = {
                refundAmount,
                cancellationFee,
              };
            }
          }
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
        // Continue with cancellation even if refund fails
      }
        } else {
      // Before confirmation: full refund
      try {
        // Find invoice for this appointment
        const [invoice] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.appointmentId, appointmentId))
          .limit(1);
        
        if (invoice) {
          const paidAmount = parseFloat(invoice.paidAmount || '0');
          if (paidAmount > 0) {
            // Process full refund
            await billingService.processRefund({
              invoiceId: invoice.id,
              amount: paidAmount,
              reason: `Appointment cancellation before confirmation. Full refund. ${cancellationReason ? `Reason: ${cancellationReason}` : ''}`,
              processedByUserId: userId,
              actorUserId: userId,
              actorRole: 'PATIENT',
            });
            
            refundInfo = {
              refundAmount: paidAmount,
              cancellationFee: 0,
            };
          }
        }
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
        // Continue with cancellation even if refund fails
      }
    }
    
    const updateData: any = {
      status: 'cancelled',
    };
    
    // Store cancellation reason and refund info in notes field
    let cancellationNote = '';
    if (isConfirmed) {
      cancellationNote = `Cancellation Reason: ${cancellationReason || 'Not specified'}\nCancelled after confirmation.`;
      if (refundInfo) {
        cancellationNote += ` 10% cancellation fee (₹${refundInfo.cancellationFee}) applied. Refund amount: ₹${refundInfo.refundAmount}`;
      }
    } else {
      cancellationNote = `Cancellation Reason: ${cancellationReason || 'Not specified'}\nCancelled before confirmation.`;
      if (refundInfo) {
        cancellationNote += ` Full refund: ₹${refundInfo.refundAmount}`;
      }
    }
    
      const currentNotes = existingAppointment.notes || '';
      updateData.notes = currentNotes ? `${currentNotes}\n${cancellationNote}` : cancellationNote;
    
    const [result] = await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, appointmentId))
      .returning();
    
    if (!result) {
      throw new Error('Failed to update appointment');
    }
    
    console.log(`✅ Appointment ${appointmentId} cancelled${cancellationReason ? ` with reason: ${cancellationReason}` : ''}${refundInfo ? `. Refund: ₹${refundInfo.refundAmount}` : ''}`);
    await emitAppointmentChanged(result.id, "cancelled");
    
    // Best-effort audit log for cancellation
    try {
      await logAuditEvent({
        hospitalId: existingAppointment.hospitalId || undefined,
        patientId: existingAppointment.patientId || undefined,
        actorUserId: userId,
        actorRole: auditContext?.actorRole || 'PATIENT',
        action: 'APPOINTMENT_CANCELLED',
        entityType: 'appointment',
        entityId: result.id,
        before: {
          status: existingAppointment.status,
          appointmentDate: existingAppointment.appointmentDate,
          timeSlot: existingAppointment.timeSlot,
        },
        after: {
          status: result.status,
          cancellationReason: cancellationReason || null,
          isConfirmed,
          refundInfo,
        },
        reason: cancellationReason || undefined,
        summary: `Appointment #${result.id} cancelled by ${auditContext?.actorRole || 'PATIENT'}`,
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log appointment cancellation audit event:', auditError);
    }
    
    // Return result with refund info
    return {
      ...result,
      refundInfo,
      isConfirmed,
    };
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    if (error instanceof Error) {
      throw error; // Re-throw with original message
    }
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

    // Token (token_identifier) was assigned at book time; confirm only updates status
    const [result] = await db
      .update(appointments)
      .set({
        status: 'confirmed',
        receptionistId,
        confirmedAt: sql`NOW()`,
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    if (!result) {
      throw new Error('Failed to update appointment');
    }

    const resultWithToken = result;

    console.log(`✅ Appointment ${appointmentId} confirmed by receptionist. New status: ${resultWithToken.status}`);
    console.log(`📋 Updated appointment:`, {
      id: resultWithToken.id,
      status: resultWithToken.status,
      receptionistId: resultWithToken.receptionistId,
      confirmedAt: resultWithToken.confirmedAt
    });
    
    // Notify patient and doctor about confirmation
    try {
      const [patientRow] = await db
        .select({ userId: patients.userId })
        .from(patients)
        .where(eq(patients.id, resultWithToken.patientId))
        .limit(1);
      
      const [doctorRow] = await db
        .select({ userId: doctors.userId })
        .from(doctors)
        .where(eq(doctors.id, resultWithToken.doctorId))
        .limit(1);

      const appointmentDate = resultWithToken.appointmentDate instanceof Date 
        ? resultWithToken.appointmentDate.toISOString().slice(0, 10)
        : String(resultWithToken.appointmentDate).slice(0, 10);
      const timeSlot = String(resultWithToken.timeSlot || '').trim();

      // Format date for display
      const appointmentDateFormatted = result.appointmentDate instanceof Date
        ? result.appointmentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : appointmentDate;

      if (patientRow?.userId) {
        // Get patient user details for SMS/Email
        const [patientUser] = await db
          .select({ 
            fullName: users.fullName,
            mobileNumber: users.mobileNumber,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, patientRow.userId))
          .limit(1);

        // Get doctor name for notification
        const [doctorUser] = doctorRow?.userId
          ? await db
              .select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, doctorRow.userId))
              .limit(1)
          : [null];
        const doctorName = doctorUser?.fullName || 'Doctor';

        // Create in-app notification
        await createNotification({
          userId: patientRow.userId,
          type: 'appointment_confirmed',
          title: 'Appointment Confirmed',
          message: `Your appointment on ${appointmentDate} (${timeSlot}) has been confirmed.`,
          relatedId: resultWithToken.id,
          relatedType: 'appointment',
        });
        console.log(`✅ Created confirmation notification for patient userId ${patientRow.userId}`);

        // Send SMS notification
        if (patientUser?.mobileNumber) {
          try {
            await smsService.sendAppointmentConfirmation(
              patientUser.mobileNumber,
              patientUser.fullName || 'Patient',
              doctorName,
              appointmentDateFormatted,
              timeSlot
            );
            console.log(`✅ Sent SMS confirmation to patient ${patientUser.mobileNumber}`);
          } catch (smsError: any) {
            console.error(`⚠️ Failed to send SMS confirmation: ${smsError.message}`);
          }
        }

        // Send Email notification
        if (patientUser?.email) {
          try {
            await emailService.sendAppointmentConfirmation(
              patientUser.email,
              patientUser.fullName || 'Patient',
              doctorName,
              appointmentDateFormatted,
              timeSlot
            );
            console.log(`✅ Sent email confirmation to patient ${patientUser.email}`);
          } catch (emailError: any) {
            console.error(`⚠️ Failed to send email confirmation: ${emailError.message}`);
          }
        }
      }

      if (doctorRow?.userId) {
        const [patientUser] = patientRow?.userId
          ? await db
              .select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, patientRow.userId))
              .limit(1)
          : [null];
        const patientName = patientUser?.fullName || 'Patient';

        await createNotification({
          userId: doctorRow.userId,
          type: 'appointment_confirmed',
          title: 'New Confirmed Appointment',
          message: `${patientName} has a confirmed appointment on ${appointmentDate} (${timeSlot}).`,
          relatedId: resultWithToken.id,
          relatedType: 'appointment',
        });
        console.log(`✅ Created confirmation notification for doctor userId ${doctorRow.userId}`);
      }
    } catch (e) {
      console.error('⚠️ Failed to create confirmation notifications:', e);
      // Don't throw - appointment confirmation should succeed even if notification fails
    }

    // Audit log: appointment confirmed by receptionist
    try {
      // Look up receptionist userId (actor)
      const [receptionist] = await db
        .select({ userId: receptionists.userId, hospitalId: receptionists.hospitalId })
        .from(receptionists)
        .where(eq(receptionists.id, receptionistId))
        .limit(1);

      await logAuditEvent({
        hospitalId: existingAppointment.hospitalId || receptionist?.hospitalId || undefined,
        patientId: existingAppointment.patientId || undefined,
        actorUserId: receptionist?.userId || 0,
        actorRole: 'RECEPTIONIST',
        action: 'APPOINTMENT_CONFIRMED',
        entityType: 'appointment',
        entityId: resultWithToken.id,
        before: {
          status: existingAppointment.status,
          tokenNumber: existingAppointment.tokenNumber,
        },
        after: {
          status: resultWithToken.status,
          tokenNumber: resultWithToken.tokenNumber,
          receptionistId,
        },
        summary: `Appointment #${resultWithToken.id} confirmed by receptionist`,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log appointment confirmation audit event:', auditError);
      // Do not block main flow on audit failures
    }

    await emitAppointmentChanged(resultWithToken.id, "confirmed");
    return resultWithToken;
  } catch (error) {
    console.error('❌ Error confirming appointment:', error);
    throw error;
  }
};

/**
 * Check-in appointment (for receptionist) - Patient enters ACTIVE queue only after check-in.
 * Uses token_identifier from appointment (assigned at book); no renumbering.
 */
export const checkInAppointment = async (appointmentId: number, receptionistId: number) => {
  console.log(`📅 Receptionist ${receptionistId} checking in patient for appointment ${appointmentId}`);

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
    if (!existing) throw new Error('Appointment not found');

    const eligibleStatuses = new Set(['confirmed', 'checked-in', 'attended', 'in_consultation']);
    if (!eligibleStatuses.has((existing.status || '').toString())) {
      throw new Error(
        `Cannot check in. Current status: ${existing.status}. Only confirmed/checked-in appointments can be checked in.`,
      );
    }

    let appointmentDateStr: string;
    const rawDate = existing.appointmentDate;
    if (rawDate instanceof Date) appointmentDateStr = rawDate.toISOString().slice(0, 10);
    else if (typeof rawDate === 'string') appointmentDateStr = rawDate.slice(0, 10);
    else appointmentDateStr = new Date(rawDate).toISOString().slice(0, 10);

    // Backfill token_identifier if missing (e.g. pre-migration appointments)
    let tokenIdentifier = (existing as any).tokenIdentifier;
    if (!tokenIdentifier) {
      const slotKey = getSlotKeyFromAppointment(existing.appointmentTime, existing.timeSlot);
      const nextSeq = await getNextSeqForSlot(tx, existing.doctorId, appointmentDateStr, slotKey);
      tokenIdentifier = formatTokenIdentifier(slotKey, nextSeq);
      await tx.update(appointments).set({ tokenIdentifier }).where(eq(appointments.id, appointmentId));
    }

    const [updated] = await tx
      .update(appointments)
      .set({
        status: 'checked-in',
        checkedInAt: sql`NOW()`,
        receptionistId,
      })
      .where(eq(appointments.id, appointmentId))
      .returning();

    if (!updated) throw new Error('Failed to update appointment');
    return updated;
  });

  // Always create OPD queue entry when appointment is checked in (so they appear in Queue Management)
  try {
    const [receptionist] = await db
      .select({ userId: receptionists.userId, hospitalId: receptionists.hospitalId })
      .from(receptionists)
      .where(eq(receptionists.id, receptionistId))
      .limit(1);
    const hospitalId = receptionist?.hospitalId ?? result.hospitalId;
    if (hospitalId == null) {
      console.warn('⚠️ No hospitalId for queue check-in; using appointment hospitalId');
    }
    await queueService.checkInToQueue(appointmentId, {
      userId: receptionist?.userId ?? 0,
      hospitalId: hospitalId ?? result.hospitalId,
    });
  } catch (e) {
    console.error('⚠️ Queue entry creation failed (appointment is already checked-in):', e);
    throw e; // Surface so caller knows queue entry wasn't created; they can retry check-in
  }

  console.log(`✅ Patient checked in for appointment ${appointmentId}`);
  await emitAppointmentChanged(result.id, 'checked-in');
  return result;
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
  actor: { userId: number; receptionistId?: number; actorRole?: string }
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

    // Convert appointmentDate string to Date object for timestamp column
    let appointmentDateValue: Date;
    if (typeof appointmentDate === 'string') {
      const dateStr = appointmentDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        appointmentDateValue = new Date(dateStr + 'T00:00:00');
      } else {
        appointmentDateValue = new Date(dateStr);
      }
      if (isNaN(appointmentDateValue.getTime())) {
        throw new Error(`Invalid appointment date format: ${appointmentDate}`);
      }
    } else if (appointmentDate instanceof Date) {
      appointmentDateValue = appointmentDate;
    } else {
      throw new Error(`appointmentDate must be a Date object or valid date string`);
    }

    const updateData: any = {
      appointmentDate: appointmentDateValue,
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

    // New slot => new stable token_identifier (never renumber; assign for new slot)
    const newSlotKey = getSlotKeyFromAppointment(appointmentTime, timeSlot);
    const newSeq = await getNextSeqForSlot(tx, existing.doctorId, newDateStr, newSlotKey);
    updateData.tokenIdentifier = formatTokenIdentifier(newSlotKey, newSeq);

    // Token handling: if changing day, reset queue-related fields and status
    if (!sameDay) {
      updateData.tokenNumber = null;
      updateData.checkedInAt = null;
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

    const [patientUser] = patientRow?.userId
      ? await db
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, patientRow.userId))
          .limit(1)
      : [null];

    const patientName = patientUser?.fullName || 'Patient';

    const fromDay = String((updated as any).rescheduledFromDate || '').slice(0, 10) || 'N/A';
    const fromSlot = String((updated as any).rescheduledFromTimeSlot || '').trim() || 'N/A';
    const toDay = String((updated as any).appointmentDate || input.appointmentDate || '').slice(0, 10);
    const toSlot = String((updated as any).timeSlot || input.timeSlot || '').trim();

    const titlePatient = 'Appointment Rescheduled';
    const msgPatient = `Your appointment has been shifted from ${fromDay} (${fromSlot}) to ${toDay} (${toSlot}). Reason: ${reason}`;

    if (patientRow?.userId) {
      await createNotification({
        userId: patientRow.userId,
        type: 'appointment_rescheduled',
        title: titlePatient,
        message: msgPatient,
        relatedId: (updated as any).id,
        relatedType: 'appointment',
      });
    }

    if (doctorRow?.userId) {
      await createNotification({
        userId: doctorRow.userId,
        type: 'appointment_rescheduled',
        title: `${patientName}: Appointment Rescheduled`,
        message: `${patientName}'s appointment has been shifted from ${fromDay} (${fromSlot}) to ${toDay} (${toSlot}).`,
        relatedId: (updated as any).id,
        relatedType: 'appointment',
      });
    }
  } catch (e) {
    console.warn('⚠️ Failed to create reschedule notifications:', e);
  }

  // Best-effort audit log for reschedule apply (appointment-level)
  try {
    await logAuditEvent({
      hospitalId: (updated as any).hospitalId || undefined,
      patientId: (updated as any).patientId || undefined,
      actorUserId: actor.userId,
      actorRole: actor.actorRole || 'RECEPTIONIST',
      action: 'APPOINTMENT_RESCHEDULED',
      entityType: 'appointment',
      entityId: (updated as any).id,
      before: {
        appointmentDate: (updated as any).rescheduledFromDate,
        timeSlot: (updated as any).rescheduledFromTimeSlot,
      },
      after: {
        appointmentDate: (updated as any).appointmentDate,
        timeSlot: (updated as any).timeSlot,
        rescheduleReason: (updated as any).rescheduleReason,
      },
      reason: rescheduleReason,
      summary: `Appointment #${(updated as any).id} rescheduled`,
    });
  } catch (auditError) {
    console.error('⚠️ Failed to log appointment reschedule audit event:', auditError);
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
