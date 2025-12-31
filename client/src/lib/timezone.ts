/**
 * IST (Indian Standard Time) Timezone Utilities
 * 
 * All date/time operations in the application use IST to avoid timezone confusion.
 * IST is UTC+5:30 (no daylight saving time).
 * 
 * Note: Currently hospital and doctor timings are hardcoded to 9 AM - 5 PM.
 * In the future, hospital admins will be able to configure hospital timings and slots,
 * and doctors will be able to set their own availability timings.
 */

/**
 * Get current date/time in IST
 * Returns a Date object representing the current time in IST
 */
export function getISTNow(): Date {
  // IST is UTC+5:30
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utcTime + (5.5 * 3600000)); // Add 5.5 hours for IST
  return istTime;
}

/**
 * Convert a date to IST
 * Takes any date and returns it as if it were in IST timezone
 */
export function toIST(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  
  // If the date is already a Date object, treat it as local time
  // For string dates from API, they might be in UTC, so we convert to IST
  const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istTime = new Date(utcTime + (5.5 * 3600000));
  return istTime;
}

/**
 * Get start of day in IST (00:00:00 IST)
 */
export function getISTStartOfDay(date?: Date | string | null): Date {
  const d = date ? toIST(date) : getISTNow();
  if (!d) return new Date();
  
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Check if two dates are on the same day in IST
 */
export function isSameDayIST(a: Date | string | null, b: Date | string | null): boolean {
  const dateA = toIST(a);
  const dateB = toIST(b);
  
  if (!dateA || !dateB) return false;
  
  const dayA = new Date(dateA);
  dayA.setHours(0, 0, 0, 0);
  
  const dayB = new Date(dateB);
  dayB.setHours(0, 0, 0, 0);
  
  return dayA.getTime() === dayB.getTime();
}

/**
 * Format date in IST for display
 * Uses dayjs if available, otherwise falls back to toLocaleString
 */
export function formatISTDate(date: Date | string | null | undefined, format?: string): string {
  const d = toIST(date);
  if (!d) return 'N/A';
  
  if (format) {
    // If dayjs is available, use it
    try {
      const dayjs = require('dayjs');
      return dayjs(d).format(format);
    } catch {
      // Fallback to native formatting
    }
  }
  
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}



