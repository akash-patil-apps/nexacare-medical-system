// server/routes/reporting.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import * as reportingService from '../services/reporting.service';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { hospitals, receptionists, doctors } from '../../shared/schema';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Helper to get hospital ID from user
 */
const getHospitalId = async (req: AuthenticatedRequest): Promise<number> => {
  const user = req.user;
  if (!user) {
    throw new Error('User not authenticated');
  }

  if (user.role?.toUpperCase() === 'HOSPITAL' || user.role?.toUpperCase() === 'ADMIN') {
    const [hospital] = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, user.id))
      .limit(1);
    if (hospital) return hospital.id;
  } else if (user.role?.toUpperCase() === 'RECEPTIONIST') {
    const [receptionist] = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, user.id))
      .limit(1);
    if (receptionist?.hospitalId) return receptionist.hospitalId;
  } else if (user.role?.toUpperCase() === 'DOCTOR') {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, user.id))
      .limit(1);
    if (doctor?.hospitalId) return doctor.hospitalId;
  }

  throw new Error('Hospital ID not found');
};

/**
 * GET /api/reports/opd - OPD operations report
 */
router.get('/opd', authorizeRoles('HOSPITAL', 'ADMIN', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const { dateFrom, dateTo, doctorId } = req.query;

    const report = await reportingService.getOpdReport({
      hospitalId,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      doctorId: doctorId ? parseInt(doctorId as string) : undefined,
    });

    res.json(report);
  } catch (err: any) {
    console.error('❌ Get OPD report error:', err);
    res.status(400).json({
      message: err.message || 'Failed to fetch OPD report',
      error: err.toString(),
    });
  }
});

/**
 * GET /api/reports/lab - Lab report
 */
router.get('/lab', authorizeRoles('HOSPITAL', 'ADMIN', 'LAB'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const { dateFrom, dateTo } = req.query;

    const report = await reportingService.getLabReport({
      hospitalId,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    res.json(report);
  } catch (err: any) {
    console.error('❌ Get Lab report error:', err);
    res.status(400).json({
      message: err.message || 'Failed to fetch Lab report',
      error: err.toString(),
    });
  }
});

/**
 * GET /api/reports/finance/opd - Finance report (OPD)
 */
router.get('/finance/opd', authorizeRoles('HOSPITAL', 'ADMIN', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const { dateFrom, dateTo } = req.query;

    const report = await reportingService.getFinanceReport({
      hospitalId,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    res.json(report);
  } catch (err: any) {
    console.error('❌ Get Finance report error:', err);
    res.status(400).json({
      message: err.message || 'Failed to fetch Finance report',
      error: err.toString(),
    });
  }
});

/**
 * GET /api/reports/ipd/census - IPD census report
 */
router.get('/ipd/census', authorizeRoles('HOSPITAL', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = await getHospitalId(req);
    const { date } = req.query;

    const report = await reportingService.getIpdCensusReport({
      hospitalId,
      date: date ? new Date(date as string) : undefined,
    });

    res.json(report);
  } catch (err: any) {
    console.error('❌ Get IPD census report error:', err);
    res.status(400).json({
      message: err.message || 'Failed to fetch IPD census report',
      error: err.toString(),
    });
  }
});

/**
 * GET /api/reports/:type/export - Export report as CSV
 */
router.get('/:type/export', authorizeRoles('HOSPITAL', 'ADMIN', 'RECEPTIONIST', 'LAB'), async (req: AuthenticatedRequest, res) => {
  try {
    const { type } = req.params;
    const { format = 'csv', ...queryParams } = req.query;

    if (format !== 'csv') {
      return res.status(400).json({ message: 'Only CSV format is supported' });
    }

    const hospitalId = await getHospitalId(req);
    let csvData = '';
    let filename = '';

    switch (type) {
      case 'opd': {
        const report = await reportingService.getOpdReport({
          hospitalId,
          dateFrom: queryParams.dateFrom ? new Date(queryParams.dateFrom as string) : undefined,
          dateTo: queryParams.dateTo ? new Date(queryParams.dateTo as string) : undefined,
          doctorId: queryParams.doctorId ? parseInt(queryParams.doctorId as string) : undefined,
        });
        csvData = reportingService.exportReportToCsv(
          report.appointments,
          ['id', 'patientId', 'doctorId', 'appointmentDate', 'status', 'type', 'createdAt']
        );
        filename = `opd-report-${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }
      case 'lab': {
        const report = await reportingService.getLabReport({
          hospitalId,
          dateFrom: queryParams.dateFrom ? new Date(queryParams.dateFrom as string) : undefined,
          dateTo: queryParams.dateTo ? new Date(queryParams.dateTo as string) : undefined,
        });
        csvData = reportingService.exportReportToCsv(
          report.orders,
          ['id', 'orderNumber', 'patientId', 'doctorId', 'status', 'createdAt', 'releasedAt']
        );
        filename = `lab-report-${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }
      case 'finance': {
        const report = await reportingService.getFinanceReport({
          hospitalId,
          dateFrom: queryParams.dateFrom ? new Date(queryParams.dateFrom as string) : undefined,
          dateTo: queryParams.dateTo ? new Date(queryParams.dateTo as string) : undefined,
        });
        csvData = reportingService.exportReportToCsv(
          report.invoices,
          ['id', 'invoiceNumber', 'patientId', 'status', 'total', 'paidAmount', 'balanceAmount', 'createdAt']
        );
        filename = `finance-report-${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }
      default:
        return res.status(400).json({ message: `Unknown report type: ${type}` });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err: any) {
    console.error('❌ Export report error:', err);
    res.status(400).json({
      message: err.message || 'Failed to export report',
      error: err.toString(),
    });
  }
});

export default router;
