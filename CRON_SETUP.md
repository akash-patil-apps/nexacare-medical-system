# Medicine Reminder Cron Job Setup

## Overview

The NexaCare Medical System includes an automatic medicine reminder system that sends notifications to patients when it's time to take their medications. This document explains how to set up and configure the reminder system.

## Two Options for Running Reminders

### Option 1: In-Process Scheduler (Recommended for Development)

The system includes an in-process scheduler that automatically runs medicine reminder checks every 30 minutes. This is enabled by default.

**Configuration:**
- Set `ENABLE_MEDICINE_REMINDERS=true` in your `.env` file (default)
- The scheduler starts automatically when the server starts
- No external cron job setup required

**Advantages:**
- ✅ Simple setup - no external services needed
- ✅ Works out of the box
- ✅ Good for development and small deployments

**Disadvantages:**
- ❌ Stops if the server restarts (unless using process manager)
- ❌ Not ideal for high-availability production setups

### Option 2: External Cron Job (Recommended for Production)

For production environments, you can use an external cron service to call the API endpoint.

**Configuration:**
1. Set `ENABLE_MEDICINE_REMINDERS=false` in your `.env` file
2. Set up an external cron job to call the endpoint every 30 minutes

**Cron Endpoint:**
```
GET /api/cron/medicine-reminders?key=YOUR_API_KEY
```

**Setup Examples:**

#### Using cron-job.org (Free Service)
1. Sign up at https://cron-job.org
2. Create a new cron job:
   - URL: `https://your-server.com/api/cron/medicine-reminders?key=YOUR_API_KEY`
   - Schedule: Every 30 minutes (`*/30 * * * *`)
   - Method: GET

#### Using EasyCron
1. Sign up at https://www.easycron.com
2. Create a new cron job with the same settings

#### Using Server Cron (Linux/Mac)
Add to your crontab (`crontab -e`):
```bash
# Run every 30 minutes
*/30 * * * * curl -s "http://localhost:3000/api/cron/medicine-reminders?key=YOUR_API_KEY" > /dev/null
```

#### Using Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily, repeat every 30 minutes
4. Action: Start a program
5. Program: `curl`
6. Arguments: `"http://localhost:3000/api/cron/medicine-reminders?key=YOUR_API_KEY"`

## Environment Variables

Add these to your `.env` file:

```env
# Cron API Key for medicine reminders
# Generate a secure random string for production
CRON_API_KEY=your-secret-cron-key-change-in-production

# Enable/disable in-process scheduler
# Set to 'false' if using external cron job
ENABLE_MEDICINE_REMINDERS=true

# Server URL (for testing)
SERVER_URL=http://localhost:3000
```

## Testing

### Test the Cron Endpoint

```bash
# Test the endpoint manually
npm run test:cron

# Or use curl
curl "http://localhost:3000/api/cron/medicine-reminders?key=YOUR_API_KEY"
```

### Expected Response

```json
{
  "success": true,
  "message": "Daily medicine reminders processed",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## How It Works

1. **Prescription Creation:**
   - When a doctor creates a prescription, the system schedules reminders
   - Reminders are based on medication frequency (QID, TID, BID, etc.)

2. **Reminder Processing:**
   - Every 30 minutes, the system checks for medications due
   - For each medication due within the next 30 minutes, a notification is sent
   - Duplicate reminders are prevented (only one per medication per day)

3. **Notification Delivery:**
   - Notifications are created in the database
   - Patients see them in their notification center
   - Future: Can be extended to send SMS/Email

## Supported Medication Frequencies

- **QID** (4x daily): 8 AM, 12 PM, 6 PM, 10 PM
- **TID** (3x daily): 8 AM, 2 PM, 8 PM
- **BID** (2x daily): 8 AM, 8 PM
- **QD** (1x daily): 8 AM (or based on timing)
- **Q8H**: Every 8 hours
- **Q12H**: Every 12 hours
- **Q6H**: Every 6 hours
- **PRN**: No scheduled reminders (as needed)

## Monitoring

Check server logs for reminder processing:

```
🔔 [2025-01-15T10:30:00.000Z] Running medicine reminder check...
✅ Medicine reminder check completed in 150ms
```

## Troubleshooting

### Reminders Not Sending

1. **Check scheduler is running:**
   - Look for "Medicine reminder scheduler started" in server logs
   - Or check if external cron job is configured correctly

2. **Check API key:**
   - Verify `CRON_API_KEY` matches in `.env` and cron job URL

3. **Check prescriptions:**
   - Ensure prescriptions have medications with valid frequencies
   - PRN medications don't get reminders

4. **Check patient userId:**
   - Patients must have a `userId` linked to their profile

### Scheduler Not Starting

- Check `ENABLE_MEDICINE_REMINDERS` is not set to `false`
- Check server logs for errors
- Verify the scheduler module is imported correctly

## Security Notes

- **Never commit `.env` file** with real API keys
- Use strong, random API keys in production
- Consider IP whitelisting for cron endpoints in production
- Use HTTPS for external cron jobs

## Future Enhancements

- SMS/Email notifications for reminders
- Customizable reminder times per patient
- Reminder preferences (opt-in/opt-out)
- Reminder history and analytics
