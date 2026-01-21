/**
 * Standardized ID Generator for NexaCare Medical System
 * 
 * Format: PREFIX + HOSPITAL_CODE + YYMMDD + HHMM + SEQUENCE
 * Examples:
 * - Appointment: APP00002101261107001 (APP + 0000 + 210126 + 1107 + 001)
 * - Invoice: INV00021021260918001 (INV + 000 + 210212 + 60918 + 001)
 * 
 * Pattern breakdown:
 * - PREFIX: 3 letters (APP, INV, PAY, etc.)
 * - HOSPITAL_CODE: 3-4 digits (000, 0000, etc.) - hospital ID padded
 * - YYMMDD: Date (210126 = 21-01-26, using 2-digit year)
 * - HHMM: Time (1107 = 11:07)
 * - SEQUENCE: 2-3 digits (01, 001, etc.)
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export type EntityType = 
  | 'appointment' 
  | 'invoice' 
  | 'payment' 
  | 'patient' 
  | 'doctor' 
  | 'lab_order' 
  | 'prescription'
  | 'ipd_encounter'
  | 'lab_report'
  | 'pharmacy_order';

const PREFIX_MAP: Record<EntityType, string> = {
  appointment: 'APP',
  invoice: 'INV',
  payment: 'PAY',
  patient: 'PAT',
  doctor: 'DOC',
  lab_order: 'LAB',
  prescription: 'PRE',
  ipd_encounter: 'IPD',
  lab_report: 'LBR',
  pharmacy_order: 'PHM',
};

/**
 * Generate standardized ID for an entity
 * Format: PREFIX + HOSPITAL_CODE + YYMMDD + HHMM + SEQUENCE
 * 
 * @param entityType - Type of entity (appointment, invoice, etc.)
 * @param tableName - Database table name to check for existing IDs
 * @param idColumn - Column name that stores the reference ID (e.g., 'referenceNumber' or 'invoiceNumber')
 * @param hospitalId - Hospital ID (used for hospital code and filtering)
 * @returns Generated ID string
 */
export async function generateStandardId(
  entityType: EntityType,
  tableName: string,
  idColumn: string,
  hospitalId?: number
): Promise<string> {
  const prefix = PREFIX_MAP[entityType];
  const now = new Date();
  
  // Get IST time (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utcTime = now.getTime();
  const istTime = new Date(utcTime + istOffset);
  
  // Format: YYMMDD (2-digit year, month, day)
  const year = String(istTime.getUTCFullYear()).slice(-2);
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Format: HHMM (hour, minute)
  const hour = String(istTime.getUTCHours()).padStart(2, '0');
  const minute = String(istTime.getUTCMinutes()).padStart(2, '0');
  const timeStr = `${hour}${minute}`;
  
  // Hospital code: Use hospital ID padded to 4 digits, or 0000 if not provided
  const hospitalCode = hospitalId ? String(hospitalId).padStart(4, '0') : '0000';
  
  // Build search pattern: PREFIX + HOSPITAL_CODE + DATE + TIME
  const basePattern = `${prefix}${hospitalCode}${dateStr}${timeStr}`;
  const searchPattern = `${basePattern}%`;
  
  // Query to find existing IDs with same pattern
  // Use raw SQL to query by pattern
  let existingIds: any[] = [];
  try {
    // Build dynamic query based on table and filters
    if (hospitalId && (tableName === 'invoices' || tableName === 'appointments' || tableName === 'payments')) {
      // For tables with hospitalId, filter by it
      const result = await db.execute(sql.raw(`
        SELECT ${idColumn} 
        FROM ${tableName} 
        WHERE ${idColumn} LIKE '${searchPattern}'
          AND hospital_id = ${hospitalId}
        ORDER BY ${idColumn} DESC
        LIMIT 100
      `));
      existingIds = Array.isArray(result) ? result : (result.rows || []);
    } else {
      const result = await db.execute(sql.raw(`
        SELECT ${idColumn} 
        FROM ${tableName} 
        WHERE ${idColumn} LIKE '${searchPattern}'
        ORDER BY ${idColumn} DESC
        LIMIT 100
      `));
      existingIds = Array.isArray(result) ? result : (result.rows || []);
    }
  } catch (error: any) {
    // If column doesn't exist yet or table doesn't exist, start with sequence 1
    console.log(`Column ${idColumn} may not exist yet in ${tableName}, starting with sequence 1:`, error?.message);
  }
  
  // Extract sequence numbers from existing IDs
  const sequences: number[] = [];
  existingIds.forEach((row: any) => {
    const id = row[idColumn] || row[idColumn.toLowerCase()] || row[idColumn.toUpperCase()];
    if (id && typeof id === 'string' && id.startsWith(basePattern)) {
      const seqStr = id.substring(basePattern.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) {
        sequences.push(seq);
      }
    }
  });
  
  // Find next available sequence
  let nextSequence = 1;
  if (sequences.length > 0) {
    const maxSeq = Math.max(...sequences);
    nextSequence = maxSeq + 1;
  }
  
  // Ensure sequence is 2-3 digits (01-999)
  // Use 2 digits for most cases, 3 if needed
  const seqLength = nextSequence > 99 ? 3 : 2;
  
  // If we exceed 999 in same minute, use seconds as additional component
  if (nextSequence > 999) {
    const second = String(istTime.getUTCSeconds()).padStart(2, '0');
    const extendedBase = `${basePattern}${second}`;
    return `${extendedBase}${String(nextSequence % 1000).padStart(3, '0')}`;
  }
  
  return `${basePattern}${String(nextSequence).padStart(seqLength, '0')}`;
}

/**
 * Generate appointment reference ID
 */
export async function generateAppointmentId(hospitalId?: number): Promise<string> {
  return generateStandardId('appointment', 'appointments', 'referenceNumber', hospitalId);
}

/**
 * Generate invoice reference ID
 */
export async function generateInvoiceId(hospitalId?: number): Promise<string> {
  return generateStandardId('invoice', 'invoices', 'invoiceNumber', hospitalId);
}

/**
 * Generate payment reference ID
 */
export async function generatePaymentId(hospitalId?: number): Promise<string> {
  return generateStandardId('payment', 'payments', 'referenceNumber', hospitalId);
}

/**
 * Generate patient reference ID
 */
export async function generatePatientId(): Promise<string> {
  return generateStandardId('patient', 'patients', 'referenceNumber');
}

/**
 * Generate lab order reference ID
 */
export async function generateLabOrderId(hospitalId?: number): Promise<string> {
  return generateStandardId('lab_order', 'labOrders', 'referenceNumber', hospitalId);
}

/**
 * Generate prescription reference ID
 */
export async function generatePrescriptionId(hospitalId?: number): Promise<string> {
  return generateStandardId('prescription', 'prescriptions', 'referenceNumber', hospitalId);
}
