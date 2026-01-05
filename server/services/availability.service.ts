import { db } from '../db';
import {
  doctorAvailabilityRules,
  doctorAvailabilityExceptions,
  doctors,
  appointments,
} from '../../shared/schema';
import { eq, and, sql, or, gte, lte } from 'drizzle-orm';

/**
 * Get all availability rules for a doctor
 */
export const getDoctorAvailabilityRules = async (doctorId: number) => {
  const rules = await db
    .select()
    .from(doctorAvailabilityRules)
    .where(
      and(
        eq(doctorAvailabilityRules.doctorId, doctorId),
        eq(doctorAvailabilityRules.isActive, true)
      )
    )
    .orderBy(doctorAvailabilityRules.dayOfWeek);

  return rules;
};

/**
 * Create or update availability rule
 */
export const upsertAvailabilityRule = async (data: {
  doctorId: number;
  hospitalId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  maxPatientsPerSlot?: number;
  isActive?: boolean;
}) => {
  // Check if rule exists for this doctor/day
  const existing = await db
    .select()
    .from(doctorAvailabilityRules)
    .where(
      and(
        eq(doctorAvailabilityRules.doctorId, data.doctorId),
        eq(doctorAvailabilityRules.dayOfWeek, data.dayOfWeek)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing rule
    const [updated] = await db
      .update(doctorAvailabilityRules)
      .set({
        startTime: data.startTime,
        endTime: data.endTime,
        slotDurationMinutes: data.slotDurationMinutes || 30,
        maxPatientsPerSlot: data.maxPatientsPerSlot || 1,
        isActive: data.isActive !== undefined ? data.isActive : true,
        updatedAt: sql`NOW()`,
      })
      .where(eq(doctorAvailabilityRules.id, existing[0].id))
      .returning();

    return updated;
  } else {
    // Create new rule
    const [created] = await db
      .insert(doctorAvailabilityRules)
      .values({
        doctorId: data.doctorId,
        hospitalId: data.hospitalId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDurationMinutes: data.slotDurationMinutes || 30,
        maxPatientsPerSlot: data.maxPatientsPerSlot || 1,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: sql`NOW()`,
      })
      .returning();

    return created;
  }
};

/**
 * Get all exceptions for a doctor (with date range filter)
 */
export const getDoctorAvailabilityExceptions = async (
  doctorId: number,
  dateFrom?: string,
  dateTo?: string
) => {
  const conditions = [eq(doctorAvailabilityExceptions.doctorId, doctorId)];

  if (dateFrom) {
    conditions.push(gte(doctorAvailabilityExceptions.date, dateFrom));
  }
  if (dateTo) {
    conditions.push(lte(doctorAvailabilityExceptions.date, dateTo));
  }

  const exceptions = await db
    .select()
    .from(doctorAvailabilityExceptions)
    .where(and(...conditions))
    .orderBy(doctorAvailabilityExceptions.date);

  return exceptions;
};

/**
 * Create availability exception (leave, override, blocked)
 */
export const createAvailabilityException = async (data: {
  doctorId: number;
  hospitalId: number;
  date: string; // YYYY-MM-DD
  type: 'leave' | 'override_hours' | 'blocked';
  startTime?: string; // HH:mm (nullable for full-day leave)
  endTime?: string; // HH:mm (nullable for full-day leave)
  reason?: string;
  createdByUserId: number;
}) => {
  // Check if exception already exists for this date
  const existing = await db
    .select()
    .from(doctorAvailabilityExceptions)
    .where(
      and(
        eq(doctorAvailabilityExceptions.doctorId, data.doctorId),
        eq(doctorAvailabilityExceptions.date, data.date)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Exception already exists for this date');
  }

  const [exception] = await db
    .insert(doctorAvailabilityExceptions)
    .values({
      doctorId: data.doctorId,
      hospitalId: data.hospitalId,
      date: data.date,
      type: data.type,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      reason: data.reason || null,
      createdByUserId: data.createdByUserId,
      createdAt: sql`NOW()`,
    })
    .returning();

  return exception;
};

/**
 * Delete availability exception
 */
export const deleteAvailabilityException = async (exceptionId: number) => {
  const [deleted] = await db
    .delete(doctorAvailabilityExceptions)
    .where(eq(doctorAvailabilityExceptions.id, exceptionId))
    .returning();

  if (!deleted) {
    throw new Error('Exception not found');
  }

  return deleted;
};

/**
 * Get available slots for a doctor on a specific date
 * This combines rules and exceptions to calculate actual availability
 */
export const getAvailableSlots = async (
  doctorId: number,
  date: string // YYYY-MM-DD
): Promise<string[]> => {
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();

  // Get weekly rule for this day
  const rules = await db
    .select()
    .from(doctorAvailabilityRules)
    .where(
      and(
        eq(doctorAvailabilityRules.doctorId, doctorId),
        eq(doctorAvailabilityRules.dayOfWeek, dayOfWeek),
        eq(doctorAvailabilityRules.isActive, true)
      )
    )
    .limit(1);

  if (rules.length === 0) {
    return []; // No rule = not available
  }

  const rule = rules[0];

  // Check for exceptions on this date
  const exceptions = await db
    .select()
    .from(doctorAvailabilityExceptions)
    .where(
      and(
        eq(doctorAvailabilityExceptions.doctorId, doctorId),
        eq(doctorAvailabilityExceptions.date, date)
      )
    )
    .limit(1);

  if (exceptions.length > 0) {
    const exception = exceptions[0];
    
    // If full-day leave or blocked, no slots available
    if (exception.type === 'leave' && !exception.startTime) {
      return [];
    }
    
    // If override_hours, use exception times instead of rule
    if (exception.type === 'override_hours' && exception.startTime && exception.endTime) {
      return generateTimeSlots(exception.startTime, exception.endTime, rule.slotDurationMinutes || 30);
    }
    
    // If partial leave (has startTime/endTime), exclude those hours
    if (exception.type === 'leave' && exception.startTime && exception.endTime) {
      // Generate slots from rule, then remove blocked time range
      const allSlots = generateTimeSlots(rule.startTime, rule.endTime, rule.slotDurationMinutes || 30);
      return allSlots.filter(slot => {
        const slotTime = slot.split('-')[0].trim();
        return !isTimeInRange(slotTime, exception.startTime!, exception.endTime!);
      });
    }
    
    // If blocked, no slots
    if (exception.type === 'blocked') {
      return [];
    }
  }

  // No exceptions, use rule times
  return generateTimeSlots(rule.startTime, rule.endTime, rule.slotDurationMinutes || 30);
};

/**
 * Generate time slots between start and end time
 */
const generateTimeSlots = (startTime: string, endTime: string, durationMinutes: number): string[] => {
  const slots: string[] = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    
    // Calculate end time
    let slotEndHour = currentHour;
    let slotEndMin = currentMin + durationMinutes;
    
    while (slotEndMin >= 60) {
      slotEndMin -= 60;
      slotEndHour += 1;
    }
    
    const slotEnd = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;
    
    // Check if slot end is before or equal to endTime
    if (
      slotEndHour < endHour ||
      (slotEndHour === endHour && slotEndMin <= endMin)
    ) {
      slots.push(`${slotStart} - ${slotEnd}`);
    }
    
    // Move to next slot
    currentMin += durationMinutes;
    while (currentMin >= 60) {
      currentMin -= 60;
      currentHour += 1;
    }
  }
  
  return slots;
};

/**
 * Check if time is in range
 */
const isTimeInRange = (time: string, rangeStart: string, rangeEnd: string): boolean => {
  const [timeHour, timeMin] = time.split(':').map(Number);
  const [startHour, startMin] = rangeStart.split(':').map(Number);
  const [endHour, endMin] = rangeEnd.split(':').map(Number);
  
  const timeMinutes = timeHour * 60 + timeMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
};

/**
 * Get appointments that will be impacted by an exception
 */
export const getImpactedAppointments = async (
  doctorId: number,
  date: string,
  exceptionType: 'leave' | 'override_hours' | 'blocked',
  startTime?: string,
  endTime?: string
) => {
  const dateObj = new Date(date + 'T00:00:00');
  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(dateObj);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all appointments for this doctor on this date
  const allAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.appointmentDate, startOfDay),
        lte(appointments.appointmentDate, endOfDay),
        or(
          eq(appointments.status, 'pending'),
          eq(appointments.status, 'confirmed'),
          eq(appointments.status, 'checked-in')
        )
      )
    );

  // Filter based on exception type
  if (exceptionType === 'leave' && !startTime) {
    // Full-day leave - all appointments are impacted
    return allAppointments;
  }

  if (exceptionType === 'blocked') {
    // Blocked - all appointments are impacted
    return allAppointments;
  }

  if (exceptionType === 'leave' && startTime && endTime) {
    // Partial leave - filter appointments in the time range
    return allAppointments.filter(apt => {
      const aptTime = apt.appointmentTime || apt.timeSlot?.split('-')[0] || '';
      return isTimeInRange(aptTime, startTime, endTime);
    });
  }

  if (exceptionType === 'override_hours' && startTime && endTime) {
    // Override hours - appointments outside the override hours are impacted
    return allAppointments.filter(apt => {
      const aptTime = apt.appointmentTime || apt.timeSlot?.split('-')[0] || '';
      return !isTimeInRange(aptTime, startTime, endTime);
    });
  }

  return allAppointments;
};
