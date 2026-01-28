import { Router } from 'express';
import * as clinicalService from '../services/clinical.service';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { receptionists, hospitals, doctors, nurses } from '../../shared/schema';
import { logAuditEvent } from '../services/audit.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Helper to get hospital ID
const getHospitalId = async (user: any): Promise<number> => {
  const userRole = user.role?.toUpperCase();
  
  if (userRole === 'RECEPTIONIST') {
    const receptionist = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, user.id))
      .limit(1);
    if (receptionist.length === 0) {
      throw new Error('Receptionist not found');
    }
    return receptionist[0].hospitalId;
  } else if (userRole === 'ADMIN' || userRole === 'HOSPITAL') {
    const hospital = await db
      .select()
      .from(hospitals)
      .where(eq(hospitals.userId, user.id))
      .limit(1);
    if (hospital.length === 0) {
      throw new Error('Hospital not found');
    }
    return hospital[0].id;
  } else if (userRole === 'DOCTOR') {
    const doctor = await db
      .select()
      .from(doctors)
      .where(eq(doctors.userId, user.id))
      .limit(1);
    if (doctor.length === 0) {
      throw new Error('Doctor not found');
    }
    if (!doctor[0].hospitalId) {
      throw new Error('Doctor not associated with a hospital');
    }
    return doctor[0].hospitalId;
  } else if (userRole === 'NURSE') {
    const nurse = await db
      .select()
      .from(nurses)
      .where(eq(nurses.userId, user.id))
      .limit(1);
    if (nurse.length === 0) {
      throw new Error('Nurse not found');
    }
    if (!nurse[0].hospitalId) {
      throw new Error('Nurse not associated with a hospital');
    }
    return nurse[0].hospitalId;
  }
  throw new Error('Unauthorized');
};

/**
 * Clinical Notes Routes
 */

// Create clinical note
router.post('/notes', authorizeRoles('DOCTOR', 'ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const hospitalId = await getHospitalId(req.user);
    const {
      patientId,
      encounterId,
      appointmentId,
      noteType,
      chiefComplaint,
      historyOfPresentIllness,
      subjective,
      objective,
      assessment,
      plan,
      admissionDiagnosis,
      physicalExamination,
      reviewOfSystems,
      allergies,
      medications,
      pastMedicalHistory,
      familyHistory,
      socialHistory,
      isDraft,
    } = req.body;

    if (!patientId || !noteType) {
      return res.status(400).json({ message: 'patientId and noteType are required' });
    }

    if (!['admission', 'progress', 'discharge', 'consultation'].includes(noteType)) {
      return res.status(400).json({ message: 'Invalid noteType. Must be: admission, progress, discharge, or consultation' });
    }

    const note = await clinicalService.createClinicalNote({
      hospitalId,
      patientId,
      encounterId,
      appointmentId,
      noteType,
      createdByUserId: req.user.id,
      chiefComplaint,
      historyOfPresentIllness,
      subjective,
      objective,
      assessment,
      plan,
      admissionDiagnosis,
      physicalExamination,
      reviewOfSystems,
      allergies,
      medications,
      pastMedicalHistory,
      familyHistory,
      socialHistory,
      isDraft,
    });

    res.json(note);
  } catch (err: any) {
    console.error('❌ Create clinical note error:', err);
    res.status(400).json({ message: err.message || 'Failed to create clinical note' });
  }
});

// Get clinical notes
router.get('/notes', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { patientId, encounterId, appointmentId, noteType } = req.query;
    const hospitalId = await getHospitalId(req.user);

    const notes = await clinicalService.getClinicalNotes({
      patientId: patientId ? +patientId : undefined,
      encounterId: encounterId ? +encounterId : undefined,
      appointmentId: appointmentId ? +appointmentId : undefined,
      noteType: noteType as string | undefined,
      hospitalId,
    });

    res.json(notes);
  } catch (err: any) {
    console.error('❌ Get clinical notes error:', err);
    res.status(400).json({ message: err.message || 'Failed to get clinical notes' });
  }
});

// Get clinical note by ID
router.get('/notes/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const note = await clinicalService.getClinicalNoteById(noteId);

    if (!note) {
      return res.status(404).json({ message: 'Clinical note not found' });
    }

    res.json(note);
  } catch (err: any) {
    console.error('❌ Get clinical note error:', err);
    res.status(400).json({ message: err.message || 'Failed to get clinical note' });
  }
});

// Update clinical note
router.patch('/notes/:id', authorizeRoles('DOCTOR', 'ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const noteId = parseInt(req.params.id);
    const note = await clinicalService.getClinicalNoteById(noteId);

    if (!note) {
      return res.status(404).json({ message: 'Clinical note not found' });
    }

    // Only creator can update (unless admin)
    if (note.createdByUserId !== req.user.id && req.user.role?.toUpperCase() !== 'ADMIN' && req.user.role?.toUpperCase() !== 'HOSPITAL') {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    const updated = await clinicalService.updateClinicalNote(noteId, req.body);
    res.json(updated);
  } catch (err: any) {
    console.error('❌ Update clinical note error:', err);
    res.status(400).json({ message: err.message || 'Failed to update clinical note' });
  }
});

// Sign clinical note
router.post('/notes/:id/sign', authorizeRoles('DOCTOR', 'ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const noteId = parseInt(req.params.id);
    const note = await clinicalService.getClinicalNoteById(noteId);

    if (!note) {
      return res.status(404).json({ message: 'Clinical note not found' });
    }

    const signed = await clinicalService.signClinicalNote(noteId, req.user.id);
    res.json(signed);
  } catch (err: any) {
    console.error('❌ Sign clinical note error:', err);
    res.status(400).json({ message: err.message || 'Failed to sign clinical note' });
  }
});

/**
 * Vitals Chart Routes
 */

// Create vitals entry
router.post('/vitals', authorizeRoles('DOCTOR', 'NURSE', 'ADMIN', 'HOSPITAL', 'RECEPTIONIST'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const hospitalId = await getHospitalId(req.user);
    const {
      patientId,
      encounterId,
      appointmentId,
      temperature,
      temperatureUnit,
      bpSystolic,
      bpDiastolic,
      pulse,
      respirationRate,
      spo2,
      painScale,
      weight,
      height,
      bmi,
      bloodGlucose,
      gcs,
      urineOutput,
      notes,
      recordedAt,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }

    const vital = await clinicalService.createVitalsEntry({
      hospitalId,
      patientId,
      encounterId,
      appointmentId,
      recordedByUserId: req.user.id,
      temperature,
      temperatureUnit,
      bpSystolic,
      bpDiastolic,
      pulse,
      respirationRate,
      spo2,
      painScale,
      weight,
      height,
      bmi,
      bloodGlucose,
      gcs,
      urineOutput,
      notes,
      recordedAt: recordedAt ? new Date(recordedAt) : undefined,
    });

    // Audit: vitals recorded
    try {
      await logAuditEvent({
        hospitalId,
        patientId,
        actorUserId: req.user.id,
        actorRole: req.user.role || 'UNKNOWN',
        action: 'VITALS_RECORDED',
        entityType: 'vitals_chart',
        entityId: vital.id,
        after: {
          temperature,
          bpSystolic,
          bpDiastolic,
          pulse,
          respirationRate,
          spo2,
          painScale,
        },
        summary: `Vitals recorded for patient ${patientId}`,
      });
    } catch (auditError) {
      console.error('⚠️ Failed to log vitals audit event:', auditError);
    }

    res.json(vital);
  } catch (err: any) {
    console.error('❌ Create vitals entry error:', err);
    res.status(400).json({ message: err.message || 'Failed to create vitals entry' });
  }
});

// Get vitals for patient
router.get('/vitals', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { patientId, encounterId, appointmentId, dateFrom, dateTo, nurse } = req.query;
    const hospitalId = await getHospitalId(req.user);

    // If nurse=true, don't require patientId (nurse can see all their vitals)
    // Otherwise, patientId is required
    if (!nurse && !patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }

    // If nurse=true and user is a nurse, filter by the nurse's user ID
    let recordedByUserId: number | undefined;
    if (nurse === 'true' && req.user?.role?.toUpperCase() === 'NURSE') {
      recordedByUserId = req.user.id;
    }

    const vitals = await clinicalService.getVitalsForPatient({
      patientId: patientId ? +patientId : undefined,
      encounterId: encounterId ? +encounterId : undefined,
      appointmentId: appointmentId ? +appointmentId : undefined,
      hospitalId,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      recordedByUserId,
    });

    res.json(vitals);
  } catch (err: any) {
    console.error('❌ Get vitals error:', err);
    res.status(400).json({ message: err.message || 'Failed to get vitals' });
  }
});

// Get vitals by ID
router.get('/vitals/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const vitalId = parseInt(req.params.id);
    const vital = await clinicalService.getVitalsById(vitalId);

    if (!vital) {
      return res.status(404).json({ message: 'Vitals entry not found' });
    }

    res.json(vital);
  } catch (err: any) {
    console.error('❌ Get vitals error:', err);
    res.status(400).json({ message: err.message || 'Failed to get vitals' });
  }
});

/**
 * Nursing Notes Routes
 */

// Create nursing note
router.post('/nursing-notes', authorizeRoles('NURSE', 'DOCTOR', 'ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const hospitalId = await getHospitalId(req.user);
    const {
      patientId,
      encounterId,
      noteType,
      nursingAssessment,
      carePlan,
      interventions,
      evaluation,
      shiftType,
      handoverNotes,
      criticalInformation,
      outstandingTasks,
      notes,
    } = req.body;

    if (!patientId || !encounterId || !noteType) {
      return res.status(400).json({ message: 'patientId, encounterId, and noteType are required' });
    }

    if (!['assessment', 'care_plan', 'shift_handover', 'general'].includes(noteType)) {
      return res.status(400).json({ message: 'Invalid noteType. Must be: assessment, care_plan, shift_handover, or general' });
    }

    const nursingNote = await clinicalService.createNursingNote({
      hospitalId,
      patientId,
      encounterId,
      noteType,
      createdByUserId: req.user.id,
      nursingAssessment,
      carePlan,
      interventions,
      evaluation,
      shiftType,
      handoverNotes,
      criticalInformation,
      outstandingTasks,
      notes,
    });

    res.json(nursingNote);
  } catch (err: any) {
    console.error('❌ Create nursing note error:', err);
    res.status(400).json({ message: err.message || 'Failed to create nursing note' });
  }
});

// Get nursing notes
router.get('/nursing-notes', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterId, patientId, noteType, nurse } = req.query;
    const hospitalId = await getHospitalId(req.user);

    // If nurse=true and user is a nurse, filter by the nurse's user ID
    let createdByUserId: number | undefined;
    if (nurse === 'true' && req.user?.role?.toUpperCase() === 'NURSE') {
      createdByUserId = req.user.id;
    }

    const nursingNotes = await clinicalService.getNursingNotes({
      encounterId: encounterId ? +encounterId : undefined,
      patientId: patientId ? +patientId : undefined,
      noteType: noteType as string | undefined,
      hospitalId,
      createdByUserId,
    });

    res.json(nursingNotes);
  } catch (err: any) {
    console.error('❌ Get nursing notes error:', err);
    res.status(400).json({ message: err.message || 'Failed to get nursing notes' });
  }
});

// Get nursing note by ID
router.get('/nursing-notes/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const noteId = parseInt(req.params.id);
    const note = await clinicalService.getNursingNoteById(noteId);

    if (!note) {
      return res.status(404).json({ message: 'Nursing note not found' });
    }

    res.json(note);
  } catch (err: any) {
    console.error('❌ Get nursing note error:', err);
    res.status(400).json({ message: err.message || 'Failed to get nursing note' });
  }
});

// Update nursing note
router.patch('/nursing-notes/:id', authorizeRoles('NURSE', 'DOCTOR', 'ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const noteId = parseInt(req.params.id);
    const note = await clinicalService.getNursingNoteById(noteId);

    if (!note) {
      return res.status(404).json({ message: 'Nursing note not found' });
    }

    // Only creator can update (unless admin)
    if (note.createdByUserId !== req.user.id && req.user.role?.toUpperCase() !== 'ADMIN' && req.user.role?.toUpperCase() !== 'HOSPITAL') {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    const updated = await clinicalService.updateNursingNote(noteId, req.body);
    res.json(updated);
  } catch (err: any) {
    console.error('❌ Update nursing note error:', err);
    res.status(400).json({ message: err.message || 'Failed to update nursing note' });
  }
});

/**
 * Diagnosis Codes Routes
 */

// Get diagnosis codes
router.get('/diagnosis-codes', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { search } = req.query;
    const codes = await clinicalService.getDiagnosisCodes(search as string | undefined);
    res.json(codes);
  } catch (err: any) {
    console.error('❌ Get diagnosis codes error:', err);
    res.status(400).json({ message: err.message || 'Failed to get diagnosis codes' });
  }
});

// Get diagnosis code by ID
router.get('/diagnosis-codes/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const codeId = parseInt(req.params.id);
    const code = await clinicalService.getDiagnosisCodeById(codeId);

    if (!code) {
      return res.status(404).json({ message: 'Diagnosis code not found' });
    }

    res.json(code);
  } catch (err: any) {
    console.error('❌ Get diagnosis code error:', err);
    res.status(400).json({ message: err.message || 'Failed to get diagnosis code' });
  }
});

// Create diagnosis code (admin only)
router.post('/diagnosis-codes', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { code, description, category } = req.body;

    if (!code || !description) {
      return res.status(400).json({ message: 'code and description are required' });
    }

    const diagnosisCode = await clinicalService.createDiagnosisCode({
      code,
      description,
      category,
    });

    res.json(diagnosisCode);
  } catch (err: any) {
    console.error('❌ Create diagnosis code error:', err);
    res.status(400).json({ message: err.message || 'Failed to create diagnosis code' });
  }
});

export default router;





