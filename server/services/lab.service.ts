import { db } from '../db';
import { labs, labReports, patients, doctors, users } from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { InsertLabReport } from '../../shared/schema-types';
import { getDoctorByUserId } from './doctors.service';

export const getAllLabs = async () => {
  return db.select().from(labs);
};

export const verifyLab = async (labId: number) => {
  return db.update(labs).set({ isActive: true }).where(eq(labs.id, labId)).returning();
};

export const createLabReport = async (data: Omit<InsertLabReport, 'id' | 'createdAt'>) => {
  return db.insert(labReports).values(data).returning();
};

// Create lab request from doctor (pending report without results)
// Helper function to auto-derive test type from test name
const deriveTestType = (testName: string): string => {
  const name = testName.toLowerCase();
  
  if (name.includes('x-ray') || name.includes('xray') || name.includes('radiography')) {
    return 'X-Ray';
  }
  if (name.includes('ct scan') || name.includes('ctscan') || name.includes('computed tomography')) {
    return 'CT Scan';
  }
  if (name.includes('mri') || name.includes('magnetic resonance')) {
    return 'MRI';
  }
  if (name.includes('ultrasound') || name.includes('sonography')) {
    return 'Ultrasound';
  }
  if (name.includes('ecg') || name.includes('ekg') || name.includes('electrocardiogram')) {
    return 'ECG';
  }
  if (name.includes('urine') || name.includes('urinalysis')) {
    return 'Urine Test';
  }
  if (name.includes('biopsy')) {
    return 'Biopsy';
  }
  if (name.includes('culture')) {
    return 'Culture';
  }
  if (name.includes('blood') || name.includes('cbc') || name.includes('glucose') || name.includes('lipid') || name.includes('lft') || name.includes('kft') || name.includes('tft')) {
    return 'Blood Test';
  }
  
  return 'Other';
};

export const createLabRequest = async (data: {
  patientId: number;
  doctorUserId: number; // User ID of the doctor
  labId?: number;
  testName: string;
  testType?: string; // Now optional
  reportDate: Date | string;
  priority?: string;
  notes?: string;
  instructions?: string;
}) => {
  // Get doctor ID from user ID
  const doctor = await getDoctorByUserId(data.doctorUserId);
  if (!doctor) {
    throw new Error('Doctor not found');
  }

  // Doctor recommends lab test - status is "recommended" until receptionist confirms with patient
  // Receptionist will confirm and change status to "pending" to send to lab
  // If labId not specified, we'll need to assign it later or use a default
  // For now, we'll require labId or get from doctor's hospital
  const labId = data.labId || 1; // TODO: Get from doctor's hospital or allow assignment later

  // Auto-derive test type from test name if not provided
  const testType = data.testType || deriveTestType(data.testName);

  // Store priority in notes if provided (since priority column doesn't exist in schema yet)
  const notesWithPriority = data.priority 
    ? `${data.priority} priority${data.notes || data.instructions ? ` - ${data.notes || data.instructions}` : ''}`
    : (data.notes || data.instructions);

  return db.insert(labReports).values({
    patientId: data.patientId,
    doctorId: doctor.id,
    labId: labId,
    testName: data.testName,
    testType: testType,
    results: 'Recommended - Awaiting patient confirmation',
    status: 'recommended', // Changed from 'pending' - now requires receptionist confirmation
    reportDate: typeof data.reportDate === 'string' ? new Date(data.reportDate) : data.reportDate,
    notes: notesWithPriority,
  }).returning();
};

export const getLabReportsForLab = async (labId: number) => {
  console.log(`🔬 Fetching lab reports for lab ID: ${labId}`);
  
  // Get all lab reports for this lab (excluding "recommended" status - those are not sent to lab yet)
  const reports = await db
    .select()
    .from(labReports)
    .where(and(
      eq(labReports.labId, labId),
      // Exclude "recommended" status - these are doctor recommendations not yet confirmed by receptionist
      // Only show reports that have been confirmed and sent to lab
    ))
    .orderBy(desc(labReports.reportDate));
  
  // Filter out "recommended" status reports (they shouldn't appear in lab dashboard)
  const filteredReports = reports.filter((report) => report.status !== 'recommended');
  
  console.log(`📋 Found ${reports.length} lab reports for lab ${labId} (${filteredReports.length} after filtering out recommended)`);
  
  // Enrich reports with patient and doctor names
  const enrichedReports = await Promise.all(
    filteredReports.map(async (report) => {
      let patientName = 'Unknown';
      let doctorName = null;
      
      // Get patient name
      if (report.patientId) {
        try {
          const [patient] = await db
            .select({ userId: patients.userId })
            .from(patients)
            .where(eq(patients.id, report.patientId))
            .limit(1);
          
          if (patient) {
            const [patientUser] = await db
              .select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, patient.userId))
              .limit(1);
            
            if (patientUser) {
              patientName = patientUser.fullName;
              console.log(`✅ Found patient name: ${patientName} for patient ID ${report.patientId}`);
            } else {
              console.log(`⚠️ User not found for patient user ID: ${patient.userId}`);
            }
          } else {
            console.log(`⚠️ Patient not found for patient ID: ${report.patientId}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching patient name for patient ID ${report.patientId}:`, error);
        }
      }
      
      // Get doctor name
      if (report.doctorId) {
        try {
          const [doctor] = await db
            .select({ userId: doctors.userId })
            .from(doctors)
            .where(eq(doctors.id, report.doctorId))
            .limit(1);
          
          if (doctor) {
            const [doctorUser] = await db
              .select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, doctor.userId))
              .limit(1);
            
            if (doctorUser) {
              doctorName = doctorUser.fullName;
              console.log(`✅ Found doctor name: ${doctorName} for doctor ID ${report.doctorId}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error fetching doctor name for doctor ID ${report.doctorId}:`, error);
        }
      }
      
      const enriched = {
        ...report,
        patientName,
        doctorName,
      };
      
      console.log(`📄 Enriched report ${report.id}: patientName="${patientName}", doctorName="${doctorName}"`);
      
      return enriched;
    })
  );
  
  console.log(`✅ Returning ${enrichedReports.length} enriched lab reports`);
  return enrichedReports;
};

export const getLabByUserId = async (userId: number) => {
  const results = await db.select().from(labs).where(eq(labs.userId, userId)).limit(1);
  return results[0] || null;
};

export const getLabReportsForPatient = async (patientId: number) => {
  return db.select().from(labReports).where(eq(labReports.patientId, patientId));
};

export const getLabReportsForDoctor = async (doctorId: number) => {
  return db.select().from(labReports).where(eq(labReports.doctorId, doctorId));
};

export const updateLabReportStatus = async (reportId: number, status: string) => {
  return db
    .update(labReports)
    .set({ status })
    .where(eq(labReports.id, reportId))
    .returning();
};

export const getLabReportById = async (reportId: number) => {
  const results = await db.select().from(labReports).where(eq(labReports.id, reportId)).limit(1);
  return results[0] || null;
};

export const updateLabReport = async (reportId: number, data: Partial<Omit<InsertLabReport, 'id' | 'createdAt'>>) => {
  return db
    .update(labReports)
    .set(data)
    .where(eq(labReports.id, reportId))
    .returning();
};

// Confirm recommended lab test - receptionist confirms with patient and sends to lab
export const confirmLabRecommendation = async (reportId: number) => {
  const [report] = await db
    .select()
    .from(labReports)
    .where(eq(labReports.id, reportId))
    .limit(1);
  
  if (!report) {
    throw new Error('Lab report not found');
  }
  
  if (report.status !== 'recommended') {
    throw new Error(`Cannot confirm lab test with status: ${report.status}. Only 'recommended' tests can be confirmed.`);
  }
  
  // Change status from "recommended" to "pending" to send to lab
  return db
    .update(labReports)
    .set({ 
      status: 'pending',
      results: 'Pending - Awaiting lab processing'
    })
    .where(eq(labReports.id, reportId))
    .returning();
};

// Get recommended lab tests for a patient (for receptionist to see)
export const getRecommendedLabTestsForPatient = async (patientId: number) => {
  console.log(`🔬 Fetching recommended lab reports for patient ID: ${patientId}`);
  
  // Select all fields from labReports (priority might not exist in schema, so we'll handle it safely)
  const reports = await db
    .select()
    .from(labReports)
    .where(and(
      eq(labReports.patientId, patientId),
      eq(labReports.status, 'recommended')
    ))
    .orderBy(desc(labReports.createdAt));

  console.log(`✅ Found ${reports.length} recommended lab reports for patient ${patientId}`);

  // Enrich with doctor names
  const enrichedReports = await Promise.all(
    reports.map(async (report) => {
      let doctorName = null;
      if (report.doctorId) {
        try {
          const [doctor] = await db
            .select({ userId: doctors.userId })
            .from(doctors)
            .where(eq(doctors.id, report.doctorId))
            .limit(1);
          if (doctor) {
            const [doctorUser] = await db
              .select({ fullName: users.fullName })
              .from(users)
              .where(eq(users.id, doctor.userId))
              .limit(1);
            if (doctorUser) {
              doctorName = doctorUser.fullName;
            }
          }
        } catch (error) {
          console.error(`❌ Error fetching doctor name for doctor ID ${report.doctorId}:`, error);
        }
      }
      
      // Extract priority from notes if it was stored there, or default to 'normal'
      let priority = 'normal';
      if (report.notes) {
        const priorityMatch = report.notes.match(/^(urgent|high|normal)\s+priority/i);
        if (priorityMatch) {
          priority = priorityMatch[1].toLowerCase();
        }
      }
      
      return { 
        ...report, 
        doctorName,
        priority, // Add priority field for frontend compatibility
      };
    })
  );

  console.log(`✅ Enriched ${enrichedReports.length} reports with doctor names`);
  return enrichedReports;
};
