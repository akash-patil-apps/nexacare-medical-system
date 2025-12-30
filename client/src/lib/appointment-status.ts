/**
 * Universal Appointment Status Constants
 * 
 * This file defines the standard appointment statuses used across all dashboards
 * to ensure consistency throughout the application.
 * 
 * Status Flow:
 * 1. pending -> Patient books appointment, waiting for receptionist confirmation
 * 2. confirmed -> Receptionist confirms the appointment
 * 3. checked-in -> Patient arrives and receptionist checks them in
 * 4. in_consultation -> Doctor starts consultation (optional intermediate state)
 * 5. completed -> Doctor finishes consultation and marks as complete
 * 6. cancelled -> Appointment is cancelled (can happen at any stage)
 * 7. no-show -> Patient didn't show up (can be set after appointment time passes)
 */

export const APPOINTMENT_STATUS = {
  // Initial states
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  
  // Active states
  CHECKED_IN: 'checked-in', // Receptionist checks in patient (hyphenated, matches backend)
  IN_CONSULTATION: 'in_consultation', // Doctor starts consultation (optional)
  ATTENDED: 'attended', // Alternative to checked-in (legacy support)
  
  // Final states
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show',
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];

/**
 * Status configuration for UI display
 * Maps status to color and label for consistent display across dashboards
 */
export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  [APPOINTMENT_STATUS.PENDING]: { color: 'orange', label: 'PENDING' },
  [APPOINTMENT_STATUS.CONFIRMED]: { color: 'blue', label: 'CONFIRMED' },
  [APPOINTMENT_STATUS.CHECKED_IN]: { color: 'cyan', label: 'CHECKED IN' },
  [APPOINTMENT_STATUS.IN_CONSULTATION]: { color: 'blue', label: 'IN CONSULTATION' },
  [APPOINTMENT_STATUS.ATTENDED]: { color: 'cyan', label: 'CHECKED IN' }, // Alias for checked-in
  [APPOINTMENT_STATUS.COMPLETED]: { color: 'green', label: 'COMPLETED' },
  [APPOINTMENT_STATUS.CANCELLED]: { color: 'red', label: 'CANCELLED' },
  [APPOINTMENT_STATUS.NO_SHOW]: { color: 'default', label: 'NO SHOW' },
};

/**
 * Legacy status mappings for backward compatibility
 * Some dashboards may use variations like 'checked_in' (underscore) or 'checked'
 */
export const LEGACY_STATUS_MAP: Record<string, AppointmentStatus> = {
  'checked_in': APPOINTMENT_STATUS.CHECKED_IN,
  'checked': APPOINTMENT_STATUS.CHECKED_IN,
  'attended': APPOINTMENT_STATUS.CHECKED_IN,
};

/**
 * Normalize status to standard format
 * Handles legacy variations and case differences
 */
export function normalizeStatus(status: string | null | undefined): AppointmentStatus {
  if (!status) return APPOINTMENT_STATUS.PENDING;
  
  const normalized = status.toLowerCase().trim();
  
  // Check legacy mappings first
  if (LEGACY_STATUS_MAP[normalized]) {
    return LEGACY_STATUS_MAP[normalized];
  }
  
  // Check if it's a valid standard status
  const validStatuses = Object.values(APPOINTMENT_STATUS);
  if (validStatuses.includes(normalized as AppointmentStatus)) {
    return normalized as AppointmentStatus;
  }
  
  // Default to pending for unknown statuses
  return APPOINTMENT_STATUS.PENDING;
}

/**
 * Get status configuration for UI display
 */
export function getStatusConfig(status: string | null | undefined): { color: string; label: string } {
  const normalized = normalizeStatus(status);
  return STATUS_CONFIG[normalized] || STATUS_CONFIG[APPOINTMENT_STATUS.PENDING];
}

/**
 * Check if status is in active/ongoing state (not final)
 */
export function isActiveStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.CHECKED_IN,
    APPOINTMENT_STATUS.IN_CONSULTATION,
    APPOINTMENT_STATUS.ATTENDED,
  ].includes(normalized);
}

/**
 * Check if status is final (completed, cancelled, or no-show)
 */
export function isFinalStatus(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return [
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ].includes(normalized);
}

/**
 * Check if status allows prescription creation/editing
 */
export function canCreatePrescription(status: string | null | undefined): boolean {
  const normalized = normalizeStatus(status);
  return [
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.CHECKED_IN,
    APPOINTMENT_STATUS.IN_CONSULTATION,
    APPOINTMENT_STATUS.ATTENDED,
  ].includes(normalized);
}


