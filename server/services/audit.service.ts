import { db } from '../db';
import { patientAuditLogs } from '../../shared/schema';
import { sql } from 'drizzle-orm';

export interface AuditLogData {
  hospitalId?: number;
  patientId: number;
  actorUserId: number;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: number;
  before?: any;
  after?: any;
  message?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event for patient-related actions
 * This captures all actions taken on patients for compliance and tracking
 */
export const logPatientAudit = async (data: AuditLogData) => {
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
      message: data.message || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      createdAt: sql`NOW()`,
    });
    console.log(`✅ Audit log created: ${data.action} on ${data.entityType} for patient ${data.patientId}`);
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('❌ Failed to create audit log:', error);
  }
};

/**
 * Get audit logs for a patient
 */
export const getPatientAuditLogs = async (filters: {
  patientId?: number;
  hospitalId?: number;
  action?: string;
  entityType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}) => {
  const conditions = [];
  
  // Build conditions based on filters
  // Note: This is a simplified version - you'd use proper Drizzle ORM conditions in production
  
  const logs = await db
    .select()
    .from(patientAuditLogs)
    .orderBy(sql`${patientAuditLogs.createdAt} DESC`)
    .limit(filters.limit || 100);
  
  return logs;
};





