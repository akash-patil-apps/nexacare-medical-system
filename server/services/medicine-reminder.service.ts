// server/services/medicine-reminder.service.ts
// Medicine reminder service for OPD prescriptions
import { db } from '../db';
import { prescriptions, patients, notifications, patientReminderSettings, medicineAdherence } from '../../shared/schema';
import { eq, and, gte, lte, sql, ilike, asc } from 'drizzle-orm';
import { NotificationService } from './localNotification.service';
import dayjs from 'dayjs';

export interface ReminderTimeSettings {
  morningTime?: string;   // HH:mm, e.g. 08:00 or 09:00
  noonTime?: string;     // 12:00 or 13:00
  afternoonTime?: string;
  nightTime?: string;    // 20:00 or 21:00
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  timing: string; // before/after meals, morning/evening, etc.
  duration: string; // how long to take
  instructions: string;
  quantity: number;
  unit: string;
}

/** Apply patient reminder time overrides (alarm settings) to a time slot */
function applyTimeSettings(time: string, settings?: ReminderTimeSettings): string {
  if (!settings) return time;
  const t = time.slice(0, 5); // HH:mm
  if (t === '09:00' || t === '08:00') return settings.morningTime ?? time;
  if (t === '12:00' || t === '13:00') return settings.noonTime ?? time;
  if (t === '14:00') return settings.afternoonTime ?? time;
  if (t === '20:00' || t === '21:00') return settings.nightTime ?? time;
  return time;
}

/**
 * Parse frequency string to reminder times
 * Returns array of times in HH:mm format. Optional settings override default alarm times (morning/noon/afternoon/night).
 */
function parseFrequencyToTimes(
  frequency: string,
  timing: string,
  dosage?: string,
  settings?: ReminderTimeSettings
): string[] {
  const freq = (frequency ?? '').toString().toLowerCase().trim();
  const timingLower = (timing ?? '').toString().toLowerCase().trim();
  const dosageStr = dosage?.trim() || '';
  const m = () => applyTimeSettings('09:00', settings);
  const a = () => applyTimeSettings('14:00', settings);
  const n = () => applyTimeSettings('20:00', settings);
  const noon = () => applyTimeSettings('12:00', settings);

  // Check for dosage format like "1-0-1" or "1-1-1" (morning-afternoon-night)
  const dosagePattern = /^(\d+)-(\d+)-(\d+)$/;
  const dosageMatch = dosageStr.match(dosagePattern);

  if (dosageMatch) {
    const [, morning, afternoon, night] = dosageMatch;
    const times: string[] = [];
    if (morning !== '0') times.push(m());
    if (afternoon !== '0') times.push(a());
    if (night !== '0') times.push(n());
    return times;
  }

  if (freq.includes('qid') || freq.includes('4 times') || freq === '4x') {
    return [m(), a(), applyTimeSettings('18:00', settings) || '18:00', '22:00'];
  }
  if (freq.includes('tid') || freq.includes('3 times') || freq === '3x') {
    return [m(), a(), n()];
  }
  if (freq.includes('bid') || freq.includes('2 times') || freq === '2x' || freq === 'twice') {
    return [m(), n()];
  }
  if (freq.includes('qd') || freq.includes('once daily') || freq === '1x' || freq === 'once') {
    if (timingLower.includes('morning')) return [m()];
    if (timingLower.includes('evening') || timingLower.includes('night')) return [n()];
    if (timingLower.includes('afternoon')) return [a()];
    return [m()];
  }
  if (freq.includes('q8h') || freq.includes('every 8 hours')) {
    return [m(), '17:00', '01:00'];
  }
  if (freq.includes('q12h') || freq.includes('every 12 hours')) {
    return [m(), applyTimeSettings('21:00', settings) || '21:00'];
  }
  if (freq.includes('q6h') || freq.includes('every 6 hours')) {
    return [m(), '15:00', '21:00', '03:00'];
  }
  if (freq.includes('prn') || freq.includes('as needed')) return [];

  return [m()];
}

/**
 * Calculate reminder times for a medication based on prescription start date and duration
 */
function calculateReminderSchedule(
  medication: Medication,
  prescriptionStartDate: Date,
  durationDays: number
): Date[] {
  const times = parseFrequencyToTimes(medication.frequency, medication.timing, medication.dosage);
  if (times.length === 0) {
    return []; // PRN medications
  }
  
  const reminders: Date[] = [];
  const startDate = dayjs(prescriptionStartDate).startOf('day');
  
  // Parse duration (e.g., "5 days", "1 week", "10 days")
  let days = durationDays;
  const durationStr = medication.duration.toLowerCase();
  if (durationStr.includes('week')) {
    const weeks = parseInt(durationStr) || 1;
    days = weeks * 7;
  } else if (durationStr.includes('day')) {
    days = parseInt(durationStr) || 7;
  } else if (durationStr.includes('month')) {
    const months = parseInt(durationStr) || 1;
    days = months * 30;
  }
  
  // Generate reminders for each day
  for (let day = 0; day < days; day++) {
    const currentDate = startDate.add(day, 'day');
    
    for (const time of times) {
      const [hours, minutes] = time.split(':').map(Number);
      const reminderDateTime = currentDate.hour(hours).minute(minutes).second(0).toDate();
      reminders.push(reminderDateTime);
    }
  }
  
  return reminders;
}

/**
 * Schedule medicine reminders for a prescription
 */
export async function scheduleMedicineReminders(prescriptionId: number) {
  try {
    // Get prescription
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);
    
    if (!prescription) {
      throw new Error('Prescription not found');
    }
    
    // Get patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, prescription.patientId))
      .limit(1);
    
    if (!patient?.userId) {
      console.warn(`⚠️ Patient ${prescription.patientId} has no userId, skipping reminders`);
      return;
    }
    
    // Parse medications
    let medications: Medication[] = [];
    try {
      medications = typeof prescription.medications === 'string'
        ? JSON.parse(prescription.medications)
        : prescription.medications;
    } catch (e) {
      console.error('Failed to parse medications:', e);
      return;
    }
    
    if (!Array.isArray(medications) || medications.length === 0) {
      return;
    }
    
    const prescriptionStartDate = prescription.createdAt
      ? new Date(prescription.createdAt)
      : new Date();
    
    // Schedule reminders for each medication
    for (const medication of medications) {
      // Skip PRN medications
      if (medication.frequency?.toLowerCase().includes('prn') || 
          medication.frequency?.toLowerCase().includes('as needed')) {
        continue;
      }
      
      // Calculate reminder schedule
      const defaultDuration = 7; // Default 7 days if duration not specified
      const reminders = calculateReminderSchedule(
        medication,
        prescriptionStartDate,
        defaultDuration
      );
      
      // Create notifications for upcoming reminders (next 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      for (const reminderTime of reminders) {
        // Only schedule reminders in the future and within next 30 days
        if (reminderTime > now && reminderTime <= thirtyDaysFromNow) {
          // Check if reminder already exists (avoid duplicates)
          // Note: We'll create reminders on-demand rather than pre-creating all of them
          // This avoids database bloat and allows for dynamic scheduling
          
          // Note: We'll create reminders dynamically via sendDailyMedicineReminders
          // This avoids creating thousands of notifications upfront
        }
      }
    }
    
    console.log(`✅ Scheduled medicine reminders for prescription ${prescriptionId}`);
  } catch (error) {
    console.error('Failed to schedule medicine reminders:', error);
    throw error;
  }
}

/**
 * Send daily medicine reminders (to be called by a cron job)
 * This checks for medications due today and sends reminders
 */
export async function sendDailyMedicineReminders() {
  try {
    const now = dayjs();
    const todayStart = now.startOf('day').toDate();
    const todayEnd = now.endOf('day').toDate();
    
    // Get all active prescriptions created in the last 30 days
    const activePrescriptions = await db
      .select()
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.isActive, true),
          gte(prescriptions.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        )
      );
    
    for (const prescription of activePrescriptions) {
      // Get patient
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, prescription.patientId))
        .limit(1);
      
      if (!patient?.userId) continue;
      
      // Parse medications
      let medications: Medication[] = [];
      try {
        medications = typeof prescription.medications === 'string'
          ? JSON.parse(prescription.medications)
          : prescription.medications;
      } catch (e) {
        continue;
      }
      
      if (!Array.isArray(medications)) continue;
      
      // Check each medication for today's reminders
      for (const medication of medications) {
        if (medication.frequency?.toLowerCase().includes('prn')) continue;
        if (medication.frequency == null || medication.frequency === '') continue;

        const times = parseFrequencyToTimes(medication.frequency, medication.timing ?? '', medication.dosage);
        
        for (const time of times) {
          const [hours, minutes] = time.split(':').map(Number);
          const reminderTime = dayjs().hour(hours).minute(minutes).second(0).toDate();
          
          // Check if it's time to send reminder (within next 30 minutes)
          const reminderWindowStart = new Date(reminderTime.getTime() - 30 * 60 * 1000);
          const reminderWindowEnd = new Date(reminderTime.getTime() + 30 * 60 * 1000);
          
          if (now.toDate() >= reminderWindowStart && now.toDate() <= reminderWindowEnd) {
            // Check if reminder already sent today for this medication
            const todayStart = dayjs().startOf('day').toDate();
            
            const existingReminders = await db
              .select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.userId, patient.userId),
                  eq(notifications.type, 'medicine_reminder'),
                  eq(notifications.relatedId, prescription.id),
                  gte(notifications.createdAt, todayStart),
                  ilike(notifications.message, `%${medication.name}%`)
                )
              )
              .limit(1);
            
            if (existingReminders.length === 0) {
              // Send reminder
              await NotificationService.createNotification({
                userId: patient.userId,
                type: 'medicine_reminder',
                title: 'Medicine Reminder',
                message: `Time to take ${medication.name} (${medication.dosage}) - ${medication.timing || medication.frequency}`,
                relatedId: prescription.id,
                relatedType: 'prescription',
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to send daily medicine reminders:', error);
  }
}

export interface PatientReminderItem {
  time: string;           // ISO-like YYYY-MM-DDTHH:mm for sorting/display
  timeLabel: string;
  medicationName: string;
  dosage: string;
  frequency?: string;
  prescriptionId: number;
  scheduledDate?: string; // YYYY-MM-DD for adherence API
  scheduledTime?: string; // HH:mm for adherence API
}

/**
 * Get patient's reminder alarm time settings (morning/noon/afternoon/night). Creates defaults if missing.
 */
export async function getPatientReminderSettings(patientId: number): Promise<ReminderTimeSettings & { id?: number }> {
  const [row] = await db
    .select()
    .from(patientReminderSettings)
    .where(eq(patientReminderSettings.patientId, patientId))
    .limit(1);
  if (row) {
    return {
      id: row.id,
      morningTime: row.morningTime ?? '09:00',
      noonTime: row.noonTime ?? '12:00',
      afternoonTime: row.afternoonTime ?? '14:00',
      nightTime: row.nightTime ?? '20:00',
    };
  }
  return {
    morningTime: '09:00',
    noonTime: '12:00',
    afternoonTime: '14:00',
    nightTime: '20:00',
  };
}

/**
 * Upsert patient reminder alarm times (for morning 8/9am, noon 12/1pm, afternoon 2pm, night 8/9pm).
 */
export async function upsertPatientReminderSettings(
  patientId: number,
  data: ReminderTimeSettings
): Promise<ReminderTimeSettings & { id: number }> {
  const [existing] = await db
    .select()
    .from(patientReminderSettings)
    .where(eq(patientReminderSettings.patientId, patientId))
    .limit(1);
  const now = new Date();
  const payload = {
    morningTime: data.morningTime ?? '09:00',
    noonTime: data.noonTime ?? '12:00',
    afternoonTime: data.afternoonTime ?? '14:00',
    nightTime: data.nightTime ?? '20:00',
    updatedAt: now,
  };
  if (existing) {
    const [updated] = await db
      .update(patientReminderSettings)
      .set(payload)
      .where(eq(patientReminderSettings.patientId, patientId))
      .returning();
    return { ...payload, id: updated!.id };
  }
  const [inserted] = await db
    .insert(patientReminderSettings)
    .values({ patientId, ...payload })
    .returning();
  return { ...payload, id: inserted!.id };
}

/**
 * Get today's and tomorrow's medicine reminder schedule for a patient (for display on dashboard).
 * Uses patient's alarm time settings (morning/noon/afternoon/night) when set.
 */
export async function getPatientReminderSchedule(patientId: number): Promise<PatientReminderItem[]> {
  const items: PatientReminderItem[] = [];
  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId)).limit(1);
  if (!patient) return items;

  const settings = await getPatientReminderSettings(patientId);
  const activePrescriptions = await db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.isActive, true)));

  const today = dayjs();
  const daysToInclude = [today, today.add(1, 'day')];

  for (const prescription of activePrescriptions) {
    let medications: Medication[] = [];
    try {
      medications = typeof prescription.medications === 'string'
        ? JSON.parse(prescription.medications)
        : prescription.medications;
    } catch {
      continue;
    }
    if (!Array.isArray(medications)) continue;

    for (const med of medications) {
      if (med.frequency?.toLowerCase().includes('prn') || !med.frequency) continue;
      const times = parseFrequencyToTimes(med.frequency, med.timing ?? '', med.dosage, settings);
      const name = med.name || 'Medication';
      const dosage = med.dosage || '';

      for (const day of daysToInclude) {
        for (const time of times) {
          const [hours, minutes] = time.split(':').map(Number);
          const timeLabel = dayjs().hour(hours).minute(minutes).format('h:mm A');
          const dateLabel = day.isSame(today, 'day') ? 'Today' : 'Tomorrow';
          const timeStr = `${day.format('YYYY-MM-DD')}T${time}`;
          const scheduledDate = day.format('YYYY-MM-DD');
          const scheduledTime = time.length >= 5 ? time.slice(0, 5) : time;
          items.push({
            time: timeStr,
            timeLabel: `${dateLabel} ${timeLabel}`,
            medicationName: name,
            dosage,
            frequency: med.frequency,
            prescriptionId: prescription.id,
            scheduledDate,
            scheduledTime,
          });
        }
      }
    }
  }

  items.sort((a, b) => a.time.localeCompare(b.time));
  return items;
}

// --- Medicine adherence (taken / skipped) ---

export type AdherenceStatus = 'taken' | 'skipped';

export interface AdherenceRecord {
  id: number;
  patientId: number;
  prescriptionId: number;
  medicationName: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: AdherenceStatus;
  takenAt: Date | null;
  createdAt: Date;
}

/**
 * Record or update adherence for a reminder slot (patient marks taken or skipped).
 */
export async function recordAdherence(
  patientId: number,
  data: {
    prescriptionId: number;
    medicationName: string;
    scheduledDate: string; // YYYY-MM-DD
    scheduledTime: string; // HH:mm
    status: AdherenceStatus;
  }
): Promise<AdherenceRecord> {
  const scheduledDate = dayjs(data.scheduledDate).startOf('day').toDate();
  const takenAt = data.status === 'taken' ? new Date() : null;
  const existing = await db
    .select()
    .from(medicineAdherence)
    .where(
      and(
        eq(medicineAdherence.patientId, patientId),
        eq(medicineAdherence.prescriptionId, data.prescriptionId),
        eq(medicineAdherence.medicationName, data.medicationName),
        eq(medicineAdherence.scheduledDate, scheduledDate),
        eq(medicineAdherence.scheduledTime, data.scheduledTime)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    const [updated] = await db
      .update(medicineAdherence)
      .set({ status: data.status, takenAt, createdAt: new Date() })
      .where(eq(medicineAdherence.id, existing[0].id))
      .returning();
    return updated as AdherenceRecord;
  }
  const [inserted] = await db
    .insert(medicineAdherence)
    .values({
      patientId,
      prescriptionId: data.prescriptionId,
      medicationName: data.medicationName,
      scheduledDate,
      scheduledTime: data.scheduledTime,
      status: data.status,
      takenAt,
    })
    .returning();
  return inserted as AdherenceRecord;
}

/**
 * Get adherence records for a patient (for dashboard/history). Optional date range.
 */
export async function getAdherenceForPatient(
  patientId: number,
  fromDate?: string,
  toDate?: string
): Promise<AdherenceRecord[]> {
  const conditions = [eq(medicineAdherence.patientId, patientId)];
  if (fromDate) {
    conditions.push(gte(medicineAdherence.scheduledDate, dayjs(fromDate).startOf('day').toDate()));
  }
  if (toDate) {
    conditions.push(lte(medicineAdherence.scheduledDate, dayjs(toDate).endOf('day').toDate()));
  }
  const rows = await db
    .select()
    .from(medicineAdherence)
    .where(and(...conditions))
    .orderBy(asc(medicineAdherence.scheduledDate), asc(medicineAdherence.scheduledTime));
  return rows as AdherenceRecord[];
}

/**
 * Get adherence status for reminder slots (today + tomorrow) so UI can show taken/skipped.
 * Returns a Set of keys "prescriptionId|medicationName|scheduledDate|scheduledTime" -> status.
 */
export async function getAdherenceMapForReminders(
  patientId: number,
  reminderItems: PatientReminderItem[]
): Promise<Map<string, AdherenceStatus>> {
  if (reminderItems.length === 0) return new Map();
  const dates = [...new Set(reminderItems.map((r) => r.scheduledDate).filter(Boolean))] as string[];
  if (dates.length === 0) return new Map();
  const from = dates.reduce((a, b) => (a < b ? a : b));
  const to = dates.reduce((a, b) => (a > b ? a : b));
  const records = await getAdherenceForPatient(patientId, from, to);
  const map = new Map<string, AdherenceStatus>();
  for (const r of records) {
    const dateStr = dayjs(r.scheduledDate).format('YYYY-MM-DD');
    map.set(`${r.prescriptionId}|${r.medicationName}|${dateStr}|${r.scheduledTime}`, r.status);
  }
  return map;
}
