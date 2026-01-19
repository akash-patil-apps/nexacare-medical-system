// server/routes/cron.routes.ts
// Cron job endpoints for scheduled tasks
import { Router } from "express";
import * as medicineReminderService from "../services/medicine-reminder.service";

const router = Router();

// Simple API key authentication for cron jobs
// In production, use a more secure method (e.g., environment variable, service account)
const CRON_API_KEY = process.env.CRON_API_KEY || 'your-secret-cron-key-change-in-production';

/**
 * Send daily medicine reminders
 * This endpoint should be called by a cron job (e.g., every 30 minutes)
 * 
 * Usage:
 * - Set up a cron job to call: GET /api/cron/medicine-reminders?key=YOUR_API_KEY
 * - Or use a service like cron-job.org, EasyCron, etc.
 */
router.get('/medicine-reminders', async (req, res) => {
  try {
    const apiKey = req.query.key as string;
    
    // Simple API key check
    if (apiKey !== CRON_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await medicineReminderService.sendDailyMedicineReminders();
    
    res.json({ 
      success: true, 
      message: 'Daily medicine reminders processed',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cron job error (medicine reminders):', error);
    res.status(500).json({ 
      error: 'Failed to process medicine reminders',
      message: error.message 
    });
  }
});

export default router;
