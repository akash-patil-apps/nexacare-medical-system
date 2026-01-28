// server/routes/audit.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { auditLogs, users, hospitals } from '../../shared/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Helper to resolve hospitalId for the current user
async function getHospitalId(req: AuthenticatedRequest): Promise<number | null> {
  const role = req.user?.role?.toUpperCase();
  if (!req.user) return null;

  if (role === 'HOSPITAL' || role === 'ADMIN') {
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, req.user.id))
      .limit(1);
    return hospital?.id ?? null;
  }

  // For other roles we could support a hospitalId on the user record in future
  return null;
}

/**
 * GET /api/audit
 * List audit logs with filters for hospital admins
 */
router.get(
  '/',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        hospitalId: queryHospitalId,
        actorUserId,
        action,
        entityType,
        patientId,
        dateFrom,
        dateTo,
        limit,
      } =
        req.query;

      const conditions: any[] = [];

      // Enforce hospital scoping for non-global admins
      const effectiveHospitalId =
        queryHospitalId != null ? Number(queryHospitalId) : await getHospitalId(req);

      if (effectiveHospitalId) {
        conditions.push(eq(auditLogs.hospitalId, effectiveHospitalId));
      }

      if (actorUserId) {
        conditions.push(eq(auditLogs.actorUserId, Number(actorUserId)));
      }

      if (action) {
        conditions.push(eq(auditLogs.action, String(action)));
      }

      if (entityType) {
        conditions.push(eq(auditLogs.entityType, String(entityType)));
      }

      if (patientId) {
        conditions.push(eq(auditLogs.patientId, Number(patientId)));
      }

      if (dateFrom) {
        conditions.push(gte(auditLogs.createdAt, new Date(String(dateFrom))));
      }

      if (dateTo) {
        conditions.push(lte(auditLogs.createdAt, new Date(String(dateTo))));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const take = limit ? Number(limit) : 100;

      const rows = await db
        .select({
          id: auditLogs.id,
          hospitalId: auditLogs.hospitalId,
          patientId: auditLogs.patientId,
          actorUserId: auditLogs.actorUserId,
          actorRole: auditLogs.actorRole,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          summary: auditLogs.summary,
          reason: auditLogs.reason,
          createdAt: auditLogs.createdAt,
          actorName: users.fullName,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorUserId))
        .where(whereClause)
        .orderBy(sql`${auditLogs.createdAt} DESC`)
        .limit(take);

      res.json({
        data: rows,
      });
    } catch (err: any) {
      console.error('❌ Get audit logs error:', err);
      res.status(400).json({
        message: err.message || 'Failed to fetch audit logs',
        error: String(err),
      });
    }
  },
);

/**
 * GET /api/audit/export
 * Export audit logs as CSV with the same filters
 */
router.get(
  '/export',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        hospitalId: queryHospitalId,
        actorUserId,
        action,
        entityType,
        patientId,
        dateFrom,
        dateTo,
      } = req.query;

      const conditions: any[] = [];

      const effectiveHospitalId =
        queryHospitalId != null ? Number(queryHospitalId) : await getHospitalId(req);

      if (effectiveHospitalId) {
        conditions.push(eq(auditLogs.hospitalId, effectiveHospitalId));
      }

      if (actorUserId) {
        conditions.push(eq(auditLogs.actorUserId, Number(actorUserId)));
      }

      if (action) {
        conditions.push(eq(auditLogs.action, String(action)));
      }

      if (entityType) {
        conditions.push(eq(auditLogs.entityType, String(entityType)));
      }

      if (patientId) {
        conditions.push(eq(auditLogs.patientId, Number(patientId)));
      }

      if (dateFrom) {
        conditions.push(gte(auditLogs.createdAt, new Date(String(dateFrom))));
      }

      if (dateTo) {
        conditions.push(lte(auditLogs.createdAt, new Date(String(dateTo))));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          createdAt: auditLogs.createdAt,
          actorName: users.fullName,
          actorRole: auditLogs.actorRole,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          patientId: auditLogs.patientId,
          summary: auditLogs.summary,
          reason: auditLogs.reason,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorUserId))
        .where(whereClause)
        .orderBy(sql`${auditLogs.createdAt} DESC`)
        .limit(1000);

      // Build CSV
      const header = [
        'Time',
        'User',
        'Role',
        'Action',
        'Entity',
        'EntityId',
        'PatientId',
        'Summary',
        'Reason',
      ];

      const escape = (value: any) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const lines = [
        header.join(','),
        ...rows.map((row) =>
          [
            row.createdAt?.toISOString?.() || row.createdAt,
            row.actorName || '',
            row.actorRole || '',
            row.action || '',
            row.entityType || '',
            row.entityId ?? '',
            row.patientId ?? '',
            row.summary || '',
            row.reason || '',
          ]
            .map(escape)
            .join(','),
        ),
      ];

      const csv = lines.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      res.send(csv);
    } catch (err: any) {
      console.error('❌ Export audit logs error:', err);
      res.status(400).json({
        message: err.message || 'Failed to export audit logs',
        error: String(err),
      });
    }
  },
);

/**
 * GET /api/audit/:id
 * Get a single audit event (with before/after JSON)
 */
router.get(
  '/:id',
  authorizeRoles('ADMIN', 'HOSPITAL'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const [row] = await db
        .select({
          id: auditLogs.id,
          hospitalId: auditLogs.hospitalId,
          patientId: auditLogs.patientId,
          actorUserId: auditLogs.actorUserId,
          actorRole: auditLogs.actorRole,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          before: auditLogs.before,
          after: auditLogs.after,
          summary: auditLogs.summary,
          reason: auditLogs.reason,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          actorName: users.fullName,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.actorUserId))
        .where(eq(auditLogs.id, Number(id)))
        .limit(1);

      if (!row) {
        return res.status(404).json({ message: 'Audit event not found' });
      }

      res.json(row);
    } catch (err: any) {
      console.error('❌ Get audit log error:', err);
      res.status(400).json({
        message: err.message || 'Failed to fetch audit event',
        error: String(err),
      });
    }
  },
);

export default router;

