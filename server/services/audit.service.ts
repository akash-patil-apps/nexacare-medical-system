import { db } from '../db';
import { patientAuditLogs, auditLogs } from '../../shared/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

export interface BaseAuditLogData {
  hospitalId?: number;
  patientId?: number;
  actorUserId: number;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: number;
  before?: any;
  after?: any;
  summary?: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * General audit logger for all high-risk actions (patient + non-patient).
 * Writes to the generic audit_logs table.
 */
export const logAuditEvent = async (data: BaseAuditLogData) => {
  try {
    await db.insert(auditLogs).values({
      hospitalId: data.hospitalId || null,
      patientId: data.patientId || null,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      before: data.before ? JSON.stringify(data.before) : null,
      after: data.after ? JSON.stringify(data.after) : null,
      summary: data.summary || null,
      reason: data.reason || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      createdAt: sql`NOW()`,
    });
    console.log(
      `✅ Audit log created: ${data.action} on ${data.entityType}${
        data.patientId ? ` for patient ${data.patientId}` : ''
      }`
    );
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('❌ Failed to create audit log:', error);
  }
};

/**
 * Backwards-compatible helper specifically for patient-related audits.
 * Keeps writing to patient_audit_logs so existing usage continues to work.
 */
export interface PatientAuditLogData extends BaseAuditLogData {
  patientId: number;
}

export const logPatientAudit = async (data: PatientAuditLogData) => {
  try {
    await db.insert(patientAuditLogs).values({
      hospitalId: data.hospitalId || null,
      patientId: data.patientId,
      actorUserId: data.actorUserId,
      actorRole: data.actorRole,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      before: data.before ? JSON.stringify(data.before) : null,
      after: data.after ? JSON.stringify(data.after) : null,
      message: data.summary || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      createdAt: sql`NOW()`,
    });
    // Also write to generic audit_logs for unified view
    await logAuditEvent(data);
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('❌ Failed to create patient audit log:', error);
  }
};

/**
 * Get audit logs for a patient (from generic audit_logs).
 */
export const getPatientAuditLogs = async (filters: {
  patientId: number;
  hospitalId?: number;
  action?: string;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}) => {
  const conditions: any[] = [eq(auditLogs.patientId, filters.patientId)];

  if (filters.hospitalId) {
    conditions.push(eq(auditLogs.hospitalId, filters.hospitalId));
  }
  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters.dateFrom) {
    conditions.push(gte(auditLogs.createdAt, filters.dateFrom));
  }
  if (filters.dateTo) {
    conditions.push(lte(auditLogs.createdAt, filters.dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(sql`${auditLogs.createdAt} DESC`)
    .limit(filters.limit || 100);

  return logs;
};








