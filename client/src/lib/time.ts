/**
 * Time formatting/parsing helpers.
 *
 * Project convention:
 * - We DISPLAY time in 12-hour format with AM/PM.
 * - Many legacy slot strings are stored without AM/PM, e.g. "02:00-02:30",
 *   but those represent AFTERNOON slots (2 PM - 2:30 PM).
 *   We normalize those for parsing/formatting to avoid 12h/24h confusion.
 */

export type ParsedTime = { hours24: number; minutes: number } | null;

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Parse "HH:mm", "HH:mm AM/PM", or legacy "02:00" (meaning 2 PM for afternoon slots).
 * If AM/PM is omitted and the hour is 2-5, we treat it as PM (legacy afternoon convention).
 */
export function parseTimeTo24h(time: string): ParsedTime {
  const raw = (time || "").toString().trim();
  if (!raw) return null;

  // Accept "02:00", "02:00 PM", "2:00PM", etc.
  const m = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;

  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const period = m[3]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;
  if (hours < 0 || hours > 23) return null;

  // If AM/PM is present, treat hours as 12-hour clock.
  if (period === "AM" || period === "PM") {
    if (hours < 1 || hours > 12) return null;
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return { hours24: hours, minutes };
  }

  // No AM/PM:
  // - If it's already 24-hour (e.g. 14:00), keep as-is.
  // - Legacy: 02:00-05:xx represent afternoon (14:00-17:xx).
  if (hours >= 2 && hours <= 5) {
    hours += 12;
  }

  return { hours24: hours, minutes };
}

export function formatTime12h(time: string): string {
  const parsed = parseTimeTo24h(time);
  if (!parsed) return time;

  const { hours24, minutes } = parsed;
  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  return `${pad2(hours12)}:${pad2(minutes)} ${period}`;
}

/**
 * Format slot ranges like:
 * - "14:00-14:30" -> "02:00 PM - 02:30 PM"
 * - "02:00-02:30" (legacy afternoon) -> "02:00 PM - 02:30 PM"
 */
export function formatTimeSlot12h(slot: string): string {
  const raw = (slot || "").toString().trim();
  if (!raw) return raw;
  if (!raw.includes("-")) return formatTime12h(raw);

  const [start, end] = raw.split("-").map((s) => s.trim());
  if (!start || !end) return raw;
  return `${formatTime12h(start)} - ${formatTime12h(end)}`;
}








