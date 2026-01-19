# Quick Start: Medicine Reminders Setup

## ✅ Automatic Setup (Default)

The medicine reminder system is **already configured and running automatically**! 

When you start the server with `npm run dev`, the scheduler will:
- ✅ Start automatically
- ✅ Check for medicine reminders every 30 minutes
- ✅ Send notifications to patients

**No additional setup required!**

## Environment Variables (Optional)

If you want to customize the behavior, add these to your `.env` file:

```env
# Optional: Disable automatic scheduler (use external cron instead)
ENABLE_MEDICINE_REMINDERS=true

# Optional: Set cron API key (for external cron jobs)
CRON_API_KEY=your-secret-cron-key-change-in-production
```

## Testing

### Test the Cron Endpoint
```bash
npm run test:cron
```

### Manual Test
```bash
curl "http://localhost:3000/api/cron/medicine-reminders?key=your-secret-cron-key-change-in-production"
```

## How It Works

1. **Doctor creates prescription** → System schedules reminders
2. **Every 30 minutes** → System checks for medications due
3. **Patient receives notification** → In their notification center

## Supported Frequencies

- QID (4x daily): 8 AM, 12 PM, 6 PM, 10 PM
- TID (3x daily): 8 AM, 2 PM, 8 PM  
- BID (2x daily): 8 AM, 8 PM
- QD (1x daily): 8 AM
- Q8H, Q12H, Q6H: Every 8/12/6 hours
- PRN: No reminders (as needed)

## Verify It's Working

Check server logs when the server starts:
```
✅ Medicine reminder scheduler started
```

Every 30 minutes, you'll see:
```
🔔 [2025-01-15T10:30:00.000Z] Running medicine reminder check...
✅ Medicine reminder check completed in 150ms
```

## That's It!

The system is ready to use. No external cron job setup needed unless you're deploying to production and want to use an external service.

For more details, see `CRON_SETUP.md`.
