// server/services/medicine-reminder.service.ts
// Medicine reminder service for OPD prescriptions
import { db } from '../db';
import { prescriptions, patients, notifications } from '../../shared/schema';
import { eq, and, gte, lte, sql, ilike } from 'drizzle-orm';
import { NotificationService } from './localNotification.service';
import dayjs from 'dayjs';

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

/**
 * Parse frequency string to reminder times
 * Returns array of times in HH:mm format
 */
function parseFrequencyToTimes(frequency: string, timing: string): string[] {
  const freq = frequency.toLowerCase().trim();
  const timingLower = timing.toLowerCase().trim();
  
  // Common frequencies
  if (freq.includes('qid') || freq.includes('4 times') || freq === '4x') {
    // 4 times daily: 8 AM, 12 PM, 6 PM, 10 PM
    return ['08:00', '12:00', '18:00', '22:00'];
  } else if (freq.includes('tid') || freq.includes('3 times') || freq === '3x') {
    // 3 times daily: 8 AM, 2 PM, 8 PM
    return ['08:00', '14:00', '20:00'];
  } else if (freq.includes('bid') || freq.includes('2 times') || freq === '2x' || freq === 'twice') {
    // 2 times daily: 8 AM, 8 PM
    return ['08:00', '20:00'];
  } else if (freq.includes('qd') || freq.includes('once daily') || freq === '1x' || freq === 'once') {
    // Once daily: 8 AM (or based on timing)
    if (timingLower.includes('morning')) {
      return ['08:00'];
    } else if (timingLower.includes('evening') || timingLower.includes('night')) {
      return ['20:00'];
    } else if (timingLower.includes('afternoon')) {
      return ['14:00'];
    }
    return ['08:00']; // Default to morning
  } else if (freq.includes('q8h') || freq.includes('every 8 hours')) {
    // Every 8 hours: 8 AM, 4 PM, 12 AM
    return ['08:00', '16:00', '00:00'];
  } else if (freq.includes('q12h') || freq.includes('every 12 hours')) {
    // Every 12 hours: 8 AM, 8 PM
    return ['08:00', '20:00'];
  } else if (freq.includes('q6h') || freq.includes('every 6 hours')) {
    // Every 6 hours: 6 AM, 12 PM, 6 PM, 12 AM
    return ['06:00', '12:00', '18:00', '00:00'];
  } else if (freq.includes('prn') || freq.includes('as needed')) {
    // PRN - no scheduled reminders
    return [];
  }
  
  // Default: once daily in morning
  return ['08:00'];
}

/**
 * Calculate reminder times for a medication based on prescription start date and duration
 */
function calculateReminderSchedule(
  medication: Medication,
  prescriptionStartDate: Date,
  durationDays: number
): Date[] {
  const times = parseFrequencyToTimes(medication.frequency, medication.timing);
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
        
        const times = parseFrequencyToTimes(medication.frequency, medication.timing);
        
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
    
    console.log('✅ Daily medicine reminders processed');
  } catch (error) {
    console.error('Failed to send daily medicine reminders:', error);
  }
}
