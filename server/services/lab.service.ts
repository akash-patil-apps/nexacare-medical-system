import { db } from '../db';
import { labs, labReports, patients, doctors, users } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
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
export const createLabRequest = async (data: {
  patientId: number;
  doctorUserId: number; // User ID of the doctor
  labId?: number;
  testName: string;
  testType: string;
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

  // For requests, we create a lab report with status "pending" and placeholder results
  // Lab technician will update with actual results later
  // If labId not specified, we'll need to assign it later or use a default
  // For now, we'll require labId or get from doctor's hospital
  const labId = data.labId || 1; // TODO: Get from doctor's hospital or allow assignment later

  return db.insert(labReports).values({
    patientId: data.patientId,
    doctorId: doctor.id,
    labId: labId,
    testName: data.testName,
    testType: data.testType,
    results: 'Pending - Awaiting lab processing',
    status: 'pending',
    reportDate: typeof data.reportDate === 'string' ? new Date(data.reportDate) : data.reportDate,
    notes: data.notes || data.instructions,
  }).returning();
};

export const getLabReportsForLab = async (labId: number) => {
  console.log(`🔬 Fetching lab reports for lab ID: ${labId}`);
  
  // Get all lab reports for this lab
  const reports = await db
    .select()
    .from(labReports)
    .where(eq(labReports.labId, labId))
    .orderBy(desc(labReports.reportDate));
  
  console.log(`📋 Found ${reports.length} lab reports for lab ${labId}`);
  
  // Enrich reports with patient and doctor names
  const enrichedReports = await Promise.all(
    reports.map(async (report) => {
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
