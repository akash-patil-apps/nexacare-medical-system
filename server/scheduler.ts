// server/scheduler.ts
// In-process scheduler for medicine reminders, follow-up reminders, and duration-based prescription deactivation
import * as medicineReminderService from './services/medicine-reminder.service';
import * as followupReminderService from './services/followup-reminder.service';
import * as prescriptionsService from './services/prescriptions.service';

const REMINDER_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let reminderInterval: NodeJS.Timeout | null = null;

/**
 * Start the medicine reminder scheduler
 * This runs the reminder check every 30 minutes
 */
export function startMedicineReminderScheduler() {
  // Don't start if already running
  if (reminderInterval) {
    return;
  }

  // Run immediately on start
  runMedicineReminderCheck();

  // Then run every 30 minutes
  reminderInterval = setInterval(() => {
    runMedicineReminderCheck();
  }, REMINDER_CHECK_INTERVAL_MS);
}

/**
 * Stop the medicine reminder scheduler
 */
export function stopMedicineReminderScheduler() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log('🛑 Medicine reminder scheduler stopped');
  }
}

/**
 * Run the medicine reminder check
 */
async function runMedicineReminderCheck() {
  try {
    const deactivated = await prescriptionsService.deactivatePrescriptionsPastDuration();
    if (deactivated > 0) {
      console.log(`✅ Auto-deactivated ${deactivated} prescription(s) past duration`);
    }
    await medicineReminderService.sendDailyMedicineReminders();
    await followupReminderService.sendFollowUpReminders();
  } catch (error) {
    console.error('❌ Error in reminder check:', error);
  }
}
