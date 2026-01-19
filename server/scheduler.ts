// server/scheduler.ts
// In-process scheduler for medicine reminders
import * as medicineReminderService from './services/medicine-reminder.service';

const REMINDER_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let reminderInterval: NodeJS.Timeout | null = null;

/**
 * Start the medicine reminder scheduler
 * This runs the reminder check every 30 minutes
 */
export function startMedicineReminderScheduler() {
  // Don't start if already running
  if (reminderInterval) {
    console.log('⚠️ Medicine reminder scheduler already running');
    return;
  }

  console.log('🕐 Starting medicine reminder scheduler...');
  console.log(`   Interval: ${REMINDER_CHECK_INTERVAL_MS / 1000 / 60} minutes`);

  // Run immediately on start
  runMedicineReminderCheck();

  // Then run every 30 minutes
  reminderInterval = setInterval(() => {
    runMedicineReminderCheck();
  }, REMINDER_CHECK_INTERVAL_MS);

  console.log('✅ Medicine reminder scheduler started');
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
    const startTime = Date.now();
    console.log(`\n🔔 [${new Date().toISOString()}] Running medicine reminder check...`);
    
    await medicineReminderService.sendDailyMedicineReminders();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Medicine reminder check completed in ${duration}ms\n`);
  } catch (error) {
    console.error('❌ Error in medicine reminder check:', error);
  }
}
