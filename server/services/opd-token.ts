/**
 * OPD Token & Slot Logic (Authoritative Spec)
 *
 * - Slot: fixed 30-minute duration. <HOUR>A = first half ( :00–:30 ), <HOUR>B = second half ( :30–:00 ).
 * - Token format: <HOUR><A|B>-<SEQ> (e.g. 15A-01, 15B-02). Identifier only, never renumbered.
 * - Queue: ACTIVE = checked-in only. Order = slot priority then arrival (check-in time). Late = after slot start → slot priority expired.
 */

const SLOT_DURATION_MINUTES = 30;
const DEFAULT_MAX_PATIENTS_PER_SLOT = 10;

export type SlotKey = { hour: number; half: 'A' | 'B' };

/**
 * Parse appointment time or timeSlot to slot start minutes since midnight.
 * timeSlot can be "02:30 PM - 03:00 PM" or "14:30-15:00"; appointmentTime can be "14:30".
 */
export function parseSlotStartToMinutes(appointmentTime: string | null | undefined, timeSlot: string | null | undefined): number {
  const raw = (timeSlot || appointmentTime || '').trim();
  if (!raw) return 0;
  const startPart = raw.includes('-') ? raw.split('-')[0].trim() : raw;
  const match = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i) || startPart.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Slot key from slot start time (minutes since midnight).
 * 30-min slots: 0–29 min = A, 30–59 min = B.
 */
export function slotKeyFromMinutes(minutes: number): SlotKey {
  const hour = Math.floor(minutes / 60) % 24;
  const min = minutes % 60;
  const half = min >= 30 ? 'B' : 'A';
  return { hour, half };
}

/**
 * Slot key from appointment (timeSlot / appointmentTime).
 */
export function getSlotKeyFromAppointment(appointmentTime: string | null | undefined, timeSlot: string | null | undefined): SlotKey {
  const minutes = parseSlotStartToMinutes(appointmentTime, timeSlot);
  return slotKeyFromMinutes(minutes);
}

/**
 * Format token identifier: <HOUR><A|B>-<SEQ>
 * e.g. 9A-01, 15B-02. SEQ zero-padded to 2 digits.
 */
export function formatTokenIdentifier(slotKey: SlotKey, seq: number): string {
  const seqStr = String(Math.max(1, Math.min(seq, 99))).padStart(2, '0');
  return `${slotKey.hour}${slotKey.half}-${seqStr}`;
}

/**
 * Parse token identifier to slot key and seq.
 * Returns { slotKey, seq } or null if invalid.
 */
export function parseTokenIdentifier(tokenIdentifier: string | null | undefined): { slotKey: SlotKey; seq: number } | null {
  if (!tokenIdentifier || typeof tokenIdentifier !== 'string') return null;
  const m = tokenIdentifier.trim().match(/^(\d{1,2})(A|B)-(\d{1,2})$/i);
  if (!m) return null;
  return {
    slotKey: { hour: parseInt(m[1], 10), half: m[2].toUpperCase() as 'A' | 'B' },
    seq: parseInt(m[3], 10),
  };
}

/**
 * Slot start time (minutes since midnight) for ordering.
 * 9A → 9*60+0, 9B → 9*60+30.
 */
export function slotKeyToMinutes(slotKey: SlotKey): number {
  return slotKey.hour * 60 + (slotKey.half === 'B' ? 30 : 0);
}

/**
 * Whether check-in is late (after slot start). Spec: late = slot priority expired, treat as walk-in at arrival.
 */
export function isLateArrival(
  slotKey: SlotKey,
  appointmentDateStr: string,
  checkedInAt: Date | string | null | undefined
): boolean {
  if (!checkedInAt) return false;
  const slotStartMinutes = slotKeyToMinutes(slotKey);
  const [y, mo, d] = appointmentDateStr.slice(0, 10).split('-').map(Number);
  const slotStart = new Date(y, (mo || 1) - 1, d || 1, Math.floor(slotStartMinutes / 60), slotStartMinutes % 60, 0);
  const checkIn = checkedInAt instanceof Date ? checkedInAt : new Date(checkedInAt);
  return checkIn > slotStart;
}

/**
 * Get max patients per slot (configurable per doctor/session). Default for now.
 */
export function getMaxPatientsPerSlot(_doctorId?: number, _dateStr?: string): number {
  return DEFAULT_MAX_PATIENTS_PER_SLOT;
}
