import { db } from '../db';
import { 
  clinicalNotes, 
  vitalsChart, 
  nursingNotes, 
  diagnosisCodes,
  type InsertClinicalNote,
  type InsertVitalsChart,
  type InsertNursingNote,
} from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
// Helper function for UTC timestamp
const nowUtc = () => new Date();

/**
 * Clinical Notes Service
 */

export const createClinicalNote = async (data: {
  hospitalId: number;
  patientId: number;
  encounterId?: number;
  appointmentId?: number;
  noteType: 'admission' | 'progress' | 'discharge' | 'consultation';
  createdByUserId: number;
  chiefComplaint?: string;
  historyOfPresentIllness?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  admissionDiagnosis?: string;
  physicalExamination?: string;
  reviewOfSystems?: string;
  allergies?: string;
  medications?: string;
  pastMedicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  isDraft?: boolean;
}) => {
  const [note] = await db
    .insert(clinicalNotes)
    .values({
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      encounterId: data.encounterId || null,
      appointmentId: data.appointmentId || null,
      noteType: data.noteType,
      createdByUserId: data.createdByUserId,
      chiefComplaint: data.chiefComplaint || null,
      historyOfPresentIllness: data.historyOfPresentIllness || null,
      subjective: data.subjective || null,
      objective: data.objective || null,
      assessment: data.assessment || null,
      plan: data.plan || null,
      admissionDiagnosis: data.admissionDiagnosis || null,
      physicalExamination: data.physicalExamination || null,
      reviewOfSystems: data.reviewOfSystems || null,
      allergies: data.allergies || null,
      medications: data.medications || null,
      pastMedicalHistory: data.pastMedicalHistory || null,
      familyHistory: data.familyHistory || null,
      socialHistory: data.socialHistory || null,
      isDraft: data.isDraft !== false,
      createdAt: nowUtc(),
    })
    .returning();

  return note;
};

export const updateClinicalNote = async (
  noteId: number,
  data: Partial<InsertClinicalNote> & { updatedAt?: Date }
) => {
  const [updated] = await db
    .update(clinicalNotes)
    .set({
      ...data,
      updatedAt: nowUtc(),
    })
    .where(eq(clinicalNotes.id, noteId))
    .returning();

  return updated;
};

export const signClinicalNote = async (noteId: number, signedByUserId: number) => {
  const [updated] = await db
    .update(clinicalNotes)
    .set({
      signedByUserId,
      signedAt: nowUtc(),
      isDraft: false,
      updatedAt: nowUtc(),
    })
    .where(eq(clinicalNotes.id, noteId))
    .returning();

  return updated;
};

export const getClinicalNotes = async (filters: {
  patientId?: number;
  encounterId?: number;
  appointmentId?: number;
  noteType?: string;
  hospitalId?: number;
}) => {
  const conditions = [];

  if (filters.patientId) {
    conditions.push(eq(clinicalNotes.patientId, filters.patientId));
  }
  if (filters.encounterId) {
    conditions.push(eq(clinicalNotes.encounterId, filters.encounterId));
  }
  if (filters.appointmentId) {
    conditions.push(eq(clinicalNotes.appointmentId, filters.appointmentId));
  }
  if (filters.noteType) {
    conditions.push(eq(clinicalNotes.noteType, filters.noteType));
  }
  if (filters.hospitalId) {
    conditions.push(eq(clinicalNotes.hospitalId, filters.hospitalId));
  }

  const notes = await db
    .select()
    .from(clinicalNotes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(clinicalNotes.createdAt));

  return notes;
};

export const getClinicalNoteById = async (noteId: number) => {
  const [note] = await db
    .select()
    .from(clinicalNotes)
    .where(eq(clinicalNotes.id, noteId))
    .limit(1);

  return note;
};

/**
 * Vitals Chart Service
 */

export const createVitalsEntry = async (data: {
  hospitalId: number;
  patientId: number;
  encounterId?: number;
  appointmentId?: number;
  recordedByUserId: number;
  temperature?: number;
  temperatureUnit?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  respirationRate?: number;
  spo2?: number;
  painScale?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  bloodGlucose?: number;
  gcs?: number;
  urineOutput?: number;
  notes?: string;
  recordedAt?: Date;
}) => {
  // Auto-calculate BMI from weight (kg) and height (cm): BMI = weight / (height/100)^2
  let bmiValue: string | null = data.bmi ? String(data.bmi) : null;
  if (bmiValue == null && data.weight != null && data.height != null) {
    const w = Number(data.weight);
    const hCm = Number(data.height);
    if (hCm > 0 && w >= 0) {
      const hM = hCm / 100;
      const bmi = Math.round((w / (hM * hM)) * 100) / 100;
      bmiValue = String(bmi);
    }
  }

  const [vital] = await db
    .insert(vitalsChart)
    .values({
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      encounterId: data.encounterId || null,
      appointmentId: data.appointmentId || null,
      recordedByUserId: data.recordedByUserId,
      temperature: data.temperature ? String(data.temperature) : null,
      temperatureUnit: data.temperatureUnit || 'C',
      bpSystolic: data.bpSystolic || null,
      bpDiastolic: data.bpDiastolic || null,
      pulse: data.pulse || null,
      respirationRate: data.respirationRate || null,
      spo2: data.spo2 || null,
      painScale: data.painScale || null,
      weight: data.weight ? String(data.weight) : null,
      height: data.height ? String(data.height) : null,
      bmi: bmiValue,
      bloodGlucose: data.bloodGlucose ? String(data.bloodGlucose) : null,
      gcs: data.gcs || null,
      urineOutput: data.urineOutput ? String(data.urineOutput) : null,
      notes: data.notes || null,
      recordedAt: data.recordedAt || nowUtc(),
      createdAt: nowUtc(),
    })
    .returning();

  return vital;
};

export const getVitalsForPatient = async (filters: {
  patientId?: number; // Made optional for nurse queries
  encounterId?: number;
  appointmentId?: number;
  hospitalId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  recordedByUserId?: number; // Filter by recorder (for nurse-specific queries)
}) => {
  const conditions = [];

  if (filters.patientId) {
    conditions.push(eq(vitalsChart.patientId, filters.patientId));
  }
  if (filters.encounterId) {
    conditions.push(eq(vitalsChart.encounterId, filters.encounterId));
  }
  if (filters.appointmentId) {
    conditions.push(eq(vitalsChart.appointmentId, filters.appointmentId));
  }
  if (filters.hospitalId) {
    conditions.push(eq(vitalsChart.hospitalId, filters.hospitalId));
  }
  if (filters.recordedByUserId) {
    conditions.push(eq(vitalsChart.recordedByUserId, filters.recordedByUserId));
  }

  const vitals = await db
    .select()
    .from(vitalsChart)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(vitalsChart.recordedAt));

  // Filter by date range if provided
  if (filters.dateFrom || filters.dateTo) {
    return vitals.filter(v => {
      const recordedAt = new Date(v.recordedAt);
      if (filters.dateFrom && recordedAt < filters.dateFrom) return false;
      if (filters.dateTo && recordedAt > filters.dateTo) return false;
      return true;
    });
  }

  return vitals;
};

export const getVitalsById = async (vitalId: number) => {
  const [vital] = await db
    .select()
    .from(vitalsChart)
    .where(eq(vitalsChart.id, vitalId))
    .limit(1);

  return vital;
};

/**
 * Nursing Notes Service
 */

export const createNursingNote = async (data: {
  hospitalId: number;
  patientId: number;
  encounterId: number;
  noteType: 'assessment' | 'care_plan' | 'shift_handover' | 'general';
  createdByUserId: number;
  nursingAssessment?: string;
  carePlan?: string;
  interventions?: string;
  evaluation?: string;
  shiftType?: string;
  handoverNotes?: string;
  criticalInformation?: string;
  outstandingTasks?: string;
  notes?: string;
}) => {
  const [note] = await db
    .insert(nursingNotes)
    .values({
      hospitalId: data.hospitalId,
      patientId: data.patientId,
      encounterId: data.encounterId,
      noteType: data.noteType,
      createdByUserId: data.createdByUserId,
      nursingAssessment: data.nursingAssessment || null,
      carePlan: data.carePlan || null,
      interventions: data.interventions || null,
      evaluation: data.evaluation || null,
      shiftType: data.shiftType || null,
      handoverNotes: data.handoverNotes || null,
      criticalInformation: data.criticalInformation || null,
      outstandingTasks: data.outstandingTasks || null,
      notes: data.notes || null,
      createdAt: nowUtc(),
    })
    .returning();

  return note;
};

export const updateNursingNote = async (
  noteId: number,
  data: Partial<InsertNursingNote>
) => {
  const [updated] = await db
    .update(nursingNotes)
    .set({
      ...data,
      updatedAt: nowUtc(),
    })
    .where(eq(nursingNotes.id, noteId))
    .returning();

  return updated;
};

export const getNursingNotes = async (filters: {
  encounterId?: number;
  patientId?: number;
  noteType?: string;
  hospitalId?: number;
  createdByUserId?: number; // Filter by creator (for nurse-specific queries)
}) => {
  const conditions = [];

  if (filters.encounterId) {
    conditions.push(eq(nursingNotes.encounterId, filters.encounterId));
  }
  if (filters.patientId) {
    conditions.push(eq(nursingNotes.patientId, filters.patientId));
  }
  if (filters.noteType) {
    conditions.push(eq(nursingNotes.noteType, filters.noteType));
  }
  if (filters.hospitalId) {
    conditions.push(eq(nursingNotes.hospitalId, filters.hospitalId));
  }
  if (filters.createdByUserId) {
    conditions.push(eq(nursingNotes.createdByUserId, filters.createdByUserId));
  }

  const notes = await db
    .select()
    .from(nursingNotes)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(nursingNotes.createdAt));

  return notes;
};

export const getNursingNoteById = async (noteId: number) => {
  const [note] = await db
    .select()
    .from(nursingNotes)
    .where(eq(nursingNotes.id, noteId))
    .limit(1);

  return note;
};

/**
 * Diagnosis Codes Service
 */

export const getDiagnosisCodes = async (search?: string) => {
  if (search) {
    // Simple search - in production, use full-text search
    const codes = await db
      .select()
      .from(diagnosisCodes)
      .where(eq(diagnosisCodes.isActive, true))
      .orderBy(diagnosisCodes.code);

    return codes.filter(
      code =>
        code.code.toLowerCase().includes(search.toLowerCase()) ||
        code.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  return db
    .select()
    .from(diagnosisCodes)
    .where(eq(diagnosisCodes.isActive, true))
    .orderBy(diagnosisCodes.code);
};

export const getDiagnosisCodeById = async (codeId: number) => {
  const [code] = await db
    .select()
    .from(diagnosisCodes)
    .where(eq(diagnosisCodes.id, codeId))
    .limit(1);

  return code;
};

export const createDiagnosisCode = async (data: {
  code: string;
  description: string;
  category?: string;
}) => {
  const [diagnosisCode] = await db
    .insert(diagnosisCodes)
    .values({
      code: data.code,
      description: data.description,
      category: data.category || null,
      isActive: true,
      createdAt: nowUtc(),
    })
    .returning();

  return diagnosisCode;
};

