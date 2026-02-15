// server/services/appointment-reschedule-requests.service.ts
import { db } from '../db';
import { 
  appointmentReschedules, 
  appointments, 
  patients, 
  doctors, 
  users 
} from '../../shared/schema';
import { eq, and, desc, ne, sql } from 'drizzle-orm';
import { emitAppointmentChanged } from '../events/appointments.events';
import { createNotification } from './notifications.service';
import { logAuditEvent } from './audit.service';
import * as appointmentService from './appointments.service';

/**
 * Create a reschedule request (patient-initiated)
 */
export const createRescheduleRequest = async (data: {
  appointmentId: number;
  requestedByUserId: number;
  newDate: string; // YYYY-MM-DD
  newTimeSlot: string; // HH:mm-HH:mm
  reasonNote?: string;
}) => {
  const { appointmentId, requestedByUserId, newDate, newTimeSlot, reasonNote } = data;

  // Get appointment details
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Check eligibility
  const currentStatus = (appointment.status || '').toString();
  if (currentStatus === 'cancelled' || currentStatus === 'completed') {
    throw new Error(`Cannot request reschedule for appointment with status: ${currentStatus}`);
  }

  // Check if appointment is in the past
  const appointmentDate = appointment.appointmentDate instanceof Date 
    ? appointment.appointmentDate 
    : new Date(appointment.appointmentDate);
  const now = new Date();
  if (appointmentDate < now) {
    throw new Error('Cannot reschedule past appointments');
  }

  // Check if there's already an active reschedule request
  const existingRequest = await db
    .select()
    .from(appointmentReschedules)
    .where(
      and(
        eq(appointmentReschedules.appointmentId, appointmentId),
        eq(appointmentReschedules.status, 'requested')
      )
    )
    .limit(1);

  if (existingRequest.length > 0) {
    throw new Error('A reschedule request is already pending for this appointment');
  }

  // Validate slot availability
  const conflicts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, appointment.doctorId),
        sql`DATE(${appointments.appointmentDate}) = DATE(${sql.raw(`'${newDate}'`)})`,
        eq(appointments.timeSlot, newTimeSlot),
        ne(appointments.id, appointmentId),
        sql`${appointments.status} != 'cancelled'`,
      ),
    )
    .limit(1);

  if (conflicts.length > 0) {
    throw new Error('Selected slot is already booked for this doctor');
  }

  // Create reschedule request
  const oldDate = appointment.appointmentDate instanceof Date 
    ? appointment.appointmentDate 
    : new Date(appointment.appointmentDate);
  const newDateValue = new Date(newDate + 'T00:00:00');

  const [rescheduleRequest] = await db
    .insert(appointmentReschedules)
    .values({
      appointmentId,
      requestedByRole: 'PATIENT',
      requestedByUserId,
      oldDate,
      oldTimeSlot: appointment.timeSlot,
      newDate: newDateValue,
      newTimeSlot,
      status: 'requested',
      reasonCategory: 'patient_requested',
      reasonNote: reasonNote || 'Patient requested reschedule',
      createdAt: sql`NOW()`,
    })
    .returning();

  // Notify receptionist (find receptionist for this hospital)
  try {
    const { receptionists } = await import('../../shared/schema');
    const [receptionist] = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.hospitalId, appointment.hospitalId))
      .limit(1);

    if (receptionist?.userId) {
      const [patientUser] = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, requestedByUserId))
        .limit(1);

      const patientName = patientUser?.fullName || 'Patient';
      const oldDateStr = oldDate.toISOString().slice(0, 10);
      const newDateStr = newDate;

      await createNotification({
        userId: receptionist.userId,
        type: 'reschedule_request',
        title: 'New Reschedule Request',
        message: `${patientName} has requested to reschedule appointment from ${oldDateStr} (${appointment.timeSlot}) to ${newDateStr} (${newTimeSlot})`,
        relatedId: appointmentId,
        relatedType: 'appointment',
      });
    }
  } catch (e) {
    console.warn('⚠️ Failed to create reschedule request notification:', e);
  }

  // Best-effort audit log for reschedule request creation (patient-initiated)
  try {
    await logAuditEvent({
      hospitalId: appointment.hospitalId || undefined,
      patientId: appointment.patientId || undefined,
      actorUserId: requestedByUserId,
      actorRole: 'PATIENT',
      action: 'RESCHEDULE_REQUEST_CREATED',
      entityType: 'appointment_reschedule',
      entityId: rescheduleRequest.id,
      before: {
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
      },
      after: {
        appointmentDate: newDateValue,
        timeSlot: newTimeSlot,
        status: 'requested',
        reasonCategory: 'patient_requested',
        reasonNote: reasonNote || 'Patient requested reschedule',
      },
      reason: reasonNote || undefined,
      summary: `Reschedule request #${rescheduleRequest.id} created by patient for appointment #${appointment.id}`,
    });
  } catch (auditError) {
    console.error('⚠️ Failed to log reschedule request creation audit event:', auditError);
  }

  return rescheduleRequest;
};

/**
 * Get reschedule requests (for receptionist/hospital admin)
 */
export const getRescheduleRequests = async (filters: {
  hospitalId?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) => {
  let query = db
    .select({
      rescheduleRequest: appointmentReschedules,
      appointment: appointments,
      patient: patients,
      doctor: doctors,
      requestedBy: users,
    })
    .from(appointmentReschedules)
    .leftJoin(appointments, eq(appointmentReschedules.appointmentId, appointments.id))
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(users, eq(appointmentReschedules.requestedByUserId, users.id));

  const conditions = [];
  if (filters.hospitalId) {
    conditions.push(eq(appointments.hospitalId, filters.hospitalId));
  }
  if (filters.status) {
    conditions.push(eq(appointmentReschedules.status, filters.status));
  }
  if (filters.dateFrom) {
    conditions.push(sql`${appointmentReschedules.createdAt} >= ${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    conditions.push(sql`${appointmentReschedules.createdAt} <= ${filters.dateTo}`);
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const results = await query.orderBy(desc(appointmentReschedules.createdAt));

  return results.map((r: any) => ({
    ...r.rescheduleRequest,
    appointment: r.appointment,
    patient: r.patient,
    doctor: r.doctor,
    requestedBy: r.requestedBy,
  }));
};

/**
 * Approve reschedule request
 */
export const approveRescheduleRequest = async (data: {
  rescheduleRequestId: number;
  reviewedByUserId: number;
  receptionistId?: number;
  actorRole?: string;
}) => {
  const { rescheduleRequestId, reviewedByUserId, receptionistId, actorRole } = data;

  // Get reschedule request
  const [rescheduleRequest] = await db
    .select()
    .from(appointmentReschedules)
    .where(eq(appointmentReschedules.id, rescheduleRequestId))
    .limit(1);

  if (!rescheduleRequest) {
    throw new Error('Reschedule request not found');
  }

  if (rescheduleRequest.status !== 'requested') {
    throw new Error(`Cannot approve reschedule request with status: ${rescheduleRequest.status}`);
  }

  // Get appointment
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, rescheduleRequest.appointmentId))
    .limit(1);

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Check if slot is still available
  const conflicts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, appointment.doctorId),
        sql`DATE(${appointments.appointmentDate}) = DATE(${sql.raw(`'${rescheduleRequest.newDate?.toISOString().slice(0, 10) || ''}'`)})`,
        eq(appointments.timeSlot, rescheduleRequest.newTimeSlot || ''),
        ne(appointments.id, appointment.id),
        sql`${appointments.status} != 'cancelled'`,
      ),
    )
    .limit(1);

  if (conflicts.length > 0) {
    throw new Error('Selected slot is no longer available');
  }

  // Update reschedule request status
  await db
    .update(appointmentReschedules)
    .set({
      status: 'approved',
      reviewedByUserId,
      reviewedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(appointmentReschedules.id, rescheduleRequestId));

  // Apply the reschedule using existing reschedule service
  const [startTime] = String(rescheduleRequest.newTimeSlot || '').split('-');
  const appointmentTime = startTime?.trim() || '09:00';
  const newDateStr = rescheduleRequest.newDate?.toISOString().slice(0, 10) || '';

  await appointmentService.rescheduleAppointment(
    appointment.id,
    {
      appointmentDate: newDateStr,
      appointmentTime,
      timeSlot: rescheduleRequest.newTimeSlot || '',
      rescheduleReason: `Patient requested: ${rescheduleRequest.reasonNote || ''}`,
    },
    { userId: reviewedByUserId, receptionistId, actorRole }
  );

  // Mark reschedule request as applied
  await db
    .update(appointmentReschedules)
    .set({
      status: 'applied',
      updatedAt: sql`NOW()`,
    })
    .where(eq(appointmentReschedules.id, rescheduleRequestId));

  // Best-effort audit log for reschedule request approval
  try {
    await logAuditEvent({
      hospitalId: appointment.hospitalId || undefined,
      patientId: appointment.patientId || undefined,
      actorUserId: reviewedByUserId,
      actorRole: actorRole || (receptionistId ? 'RECEPTIONIST' : 'HOSPITAL'),
      action: 'RESCHEDULE_REQUEST_APPROVED',
      entityType: 'appointment_reschedule',
      entityId: rescheduleRequest.id,
      before: {
        status: rescheduleRequest.status,
        newDate: rescheduleRequest.newDate,
        newTimeSlot: rescheduleRequest.newTimeSlot,
      },
      after: {
        status: 'approved',
        reviewedByUserId,
      },
      summary: `Reschedule request #${rescheduleRequest.id} approved`,
    });
  } catch (auditError) {
    console.error('⚠️ Failed to log reschedule request approval audit event:', auditError);
  }

  // Notify patient
  try {
    const [patient] = await db
      .select({ userId: patients.userId })
      .from(patients)
      .where(eq(patients.id, appointment.patientId))
      .limit(1);

    if (patient?.userId) {
      await createNotification({
        userId: patient.userId,
        type: 'reschedule_approved',
        title: 'Reschedule Request Approved',
        message: `Your reschedule request has been approved. New appointment: ${newDateStr} (${rescheduleRequest.newTimeSlot})`,
        relatedId: appointment.id,
        relatedType: 'appointment',
      });
    }
  } catch (e) {
    console.warn('⚠️ Failed to create approval notification:', e);
  }

  return { success: true };
};

/**
 * Reject reschedule request
 */
export const rejectRescheduleRequest = async (data: {
  rescheduleRequestId: number;
  reviewedByUserId: number;
  rejectionReason: string;
  actorRole?: string;
}) => {
  const { rescheduleRequestId, reviewedByUserId, rejectionReason, actorRole } = data;

  // Get reschedule request
  const [rescheduleRequest] = await db
    .select()
    .from(appointmentReschedules)
    .where(eq(appointmentReschedules.id, rescheduleRequestId))
    .limit(1);

  if (!rescheduleRequest) {
    throw new Error('Reschedule request not found');
  }

  if (rescheduleRequest.status !== 'requested') {
    throw new Error(`Cannot reject reschedule request with status: ${rescheduleRequest.status}`);
  }

  // Update reschedule request status
  await db
    .update(appointmentReschedules)
    .set({
      status: 'rejected',
      reviewedByUserId,
      reviewedAt: sql`NOW()`,
      rejectionReason,
      updatedAt: sql`NOW()`,
    })
    .where(eq(appointmentReschedules.id, rescheduleRequestId));

  // Notify patient
  try {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, rescheduleRequest.appointmentId))
      .limit(1);

    if (appointment) {
      const [patient] = await db
        .select({ userId: patients.userId })
        .from(patients)
        .where(eq(patients.id, appointment.patientId))
        .limit(1);

      if (patient?.userId) {
        await createNotification({
          userId: patient.userId,
          type: 'reschedule_rejected',
          title: 'Reschedule Request Rejected',
          message: `Your reschedule request has been rejected. Reason: ${rejectionReason}`,
          relatedId: appointment.id,
          relatedType: 'appointment',
        });
      }
    }
  } catch (e) {
    console.warn('⚠️ Failed to create rejection notification:', e);
  }

  // Best-effort audit log for reschedule request rejection
  try {
    const [apt] = await db.select().from(appointments).where(eq(appointments.id, rescheduleRequest.appointmentId)).limit(1);
    await logAuditEvent({
      hospitalId: apt?.hospitalId || undefined,
      patientId: apt?.patientId || undefined,
      actorUserId: reviewedByUserId,
      actorRole: actorRole || 'RECEPTIONIST',
      action: 'RESCHEDULE_REQUEST_REJECTED',
      entityType: 'appointment_reschedule',
      entityId: rescheduleRequest.id,
      before: {
        status: rescheduleRequest.status,
      },
      after: {
        status: 'rejected',
        rejectionReason,
      },
      reason: rejectionReason,
      summary: `Reschedule request #${rescheduleRequest.id} rejected`,
    });
  } catch (auditError) {
    console.error('⚠️ Failed to log reschedule request rejection audit event:', auditError);
  }

  return { success: true };
};

/**
 * Get reschedule requests for a patient
 */
export const getPatientRescheduleRequests = async (patientUserId: number) => {
  const results = await db
    .select({
      rescheduleRequest: appointmentReschedules,
      appointment: appointments,
      doctor: doctors,
    })
    .from(appointmentReschedules)
    .leftJoin(appointments, eq(appointmentReschedules.appointmentId, appointments.id))
    .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .where(
      and(
        eq(patients.userId, patientUserId),
        eq(appointmentReschedules.requestedByUserId, patientUserId)
      )
    )
    .orderBy(desc(appointmentReschedules.createdAt));

  return results.map((r: any) => ({
    ...r.rescheduleRequest,
    appointment: r.appointment,
    doctor: r.doctor,
  }));
};
