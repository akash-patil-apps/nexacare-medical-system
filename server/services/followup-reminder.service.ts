// server/services/followup-reminder.service.ts
// Follow-up date reminder service for prescriptions
import { db } from '../db';
import { prescriptions, patients, users, notifications } from '../../shared/schema';
import { eq, and, gte, lte, isNotNull } from 'drizzle-orm';
import { NotificationService } from './localNotification.service';
import dayjs from 'dayjs';

/**
 * Send follow-up reminders for prescriptions
 * This checks for prescriptions with follow-up dates in the next 24 hours
 * and sends reminders to patients
 */
export async function sendFollowUpReminders() {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Find prescriptions with follow-up dates between now and tomorrow
    const prescriptionsWithFollowUp = await db
      .select({
        prescription: prescriptions,
        patient: patients,
        user: users,
      })
      .from(prescriptions)
      .innerJoin(patients, eq(prescriptions.patientId, patients.id))
      .innerJoin(users, eq(patients.userId, users.id))
      .where(
        and(
          isNotNull(prescriptions.followUpDate),
          gte(prescriptions.followUpDate, now),
          lte(prescriptions.followUpDate, tomorrow)
        )
      );

    for (const row of prescriptionsWithFollowUp) {
      const { prescription, user } = row;
      
      if (!prescription.followUpDate || !user.id) {
        continue;
      }

      const followUpDate = new Date(prescription.followUpDate);
      const hoursUntilFollowUp = (followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Send reminder if follow-up is within 24 hours
      if (hoursUntilFollowUp <= 24 && hoursUntilFollowUp > 0) {
        // Check if reminder already sent today
        const todayStart = dayjs().startOf('day').toDate();
        
        const existingReminders = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, user.id),
              eq(notifications.type, 'followup_reminder'),
              eq(notifications.relatedId, prescription.id),
              gte(notifications.createdAt, todayStart)
            )
          )
          .limit(1);
        
        if (existingReminders.length === 0) {
          const followUpDateStr = dayjs(followUpDate).format('DD-MM-YYYY');
          
          await NotificationService.createNotification({
            userId: user.id,
            type: 'followup_reminder',
            title: 'Follow-up Appointment Reminder',
            message: `You have a follow-up appointment scheduled for ${followUpDateStr}. Please visit your doctor.`,
            relatedId: prescription.id,
            relatedType: 'prescription',
          });
        }
      }
    }
    
    console.log(`✅ Checked follow-up reminders for ${prescriptionsWithFollowUp.length} prescriptions`);
  } catch (error) {
    console.error('Failed to send follow-up reminders:', error);
  }
}

/**
 * Schedule follow-up reminder when prescription is created/updated
 */
export async function scheduleFollowUpReminder(prescriptionId: number) {
  try {
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);
    
    if (!prescription || !prescription.followUpDate) {
      return; // No follow-up date, skip
    }
    
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, prescription.patientId))
      .limit(1);
    
    if (!patient?.userId) {
      return; // No patient user ID, skip
    }
    
    const followUpDate = new Date(prescription.followUpDate);
    const now = new Date();
    const hoursUntilFollowUp = (followUpDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Only schedule if follow-up is in the future and within 30 days
    if (hoursUntilFollowUp > 0 && hoursUntilFollowUp <= 24 * 30) {
      // The reminder will be sent by the daily cron job
      // We just need to ensure the prescription has a follow-up date
      console.log(`✅ Follow-up reminder scheduled for prescription ${prescriptionId} on ${followUpDate.toISOString()}`);
    }
  } catch (error) {
    console.error('Failed to schedule follow-up reminder:', error);
  }
}
