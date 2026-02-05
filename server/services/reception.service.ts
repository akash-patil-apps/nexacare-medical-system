// server/services/reception.service.ts
import { and, eq, isNull, asc, desc, ilike, or, count, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db';
import {
  appointments,
  doctors,
  patients,
  receptionists,
  users,
  labReports,
  prescriptions,
  hospitals,
} from '../../shared/schema';
import type { InsertReceptionist } from '../../shared/schema-types';
import { hashPassword } from './auth.service';
import { createNotification } from './notifications.service';
import { getDoctorsByHospital } from './doctors.service';

/**
 * Add a new receptionist to a hospital.
 */
export const addReceptionist = async (data: InsertReceptionist) => {
  return db.insert(receptionists).values(data).returning();
};

/**
 * Get all receptionists for a given hospital.
 */
export const getReceptionistsByHospital = async (hospitalId: number) => {
  return db.select().from(receptionists).where(eq(receptionists.hospitalId, hospitalId));
};

/**
 * Get walk-in appointments that have not yet been confirmed.
 * (Assumes 'walk-in' type, pending status, and null receptionist)
 */
export const getWalkInAppointments = async (receptionistUserId: number) => {
  const context = await getReceptionistContext(receptionistUserId);
  if (!context) return [];

  const doctorUsers = alias(users, 'doctor_users');

  const results = await db
    .select({
      id: appointments.id,
      priority: appointments.priority,
      status: appointments.status,
      reason: appointments.reason,
      notes: appointments.notes,
      appointmentDate: appointments.appointmentDate,
      appointmentTime: appointments.appointmentTime,
      createdAt: appointments.createdAt,
      timeSlot: appointments.timeSlot,
      patientName: users.fullName,
      patientPhone: users.mobileNumber,
      doctorId: appointments.doctorId,
      doctorName: doctorUsers.fullName,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .innerJoin(users, eq(patients.userId, users.id))
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .innerJoin(doctorUsers, eq(doctors.userId, doctorUsers.id))
    .where(
      and(
        eq(appointments.hospitalId, context.hospitalId),
        eq(appointments.type, 'walk-in'),
        eq(appointments.status, 'pending'),
        isNull(appointments.receptionistId)
      )
    )
    .orderBy(asc(appointments.createdAt));

  return results.map((item) => ({
    id: item.id,
    priority: item.priority ?? 'normal',
    status: item.status,
    reason: item.reason,
    notes: item.notes,
    appointmentDate: item.appointmentDate,
    appointmentTime: item.appointmentTime,
    timeSlot: item.timeSlot,
    createdAt: item.createdAt,
    patientName: item.patientName,
    patientPhone: item.patientPhone,
    doctorId: item.doctorId,
    doctorName: item.doctorName,
  }));
};

/**
 * Confirm an appointment and notify doctor + patient.
 */
export const confirmAppointment = async (appointmentId: number, receptionistId: number) => {
  const [updated] = await db
    .update(appointments)
    .set({
      status: 'confirmed',
      receptionistId,
      confirmedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId))
    .returning();

  if (!updated) throw new Error('Appointment not found');

  const { patientId, doctorId } = updated;

  await Promise.all([
    createNotification({
      userId: patientId,
      type: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: `Your appointment has been confirmed.`,
    }),
    createNotification({
      userId: doctorId,
      type: 'appointment_confirmed',
      title: 'New Patient Assigned',
      message: `A patient appointment has been confirmed.`,
    }),
  ]);

  return updated;
};

/**
 * Get doctors available to a receptionist (same hospital).
 * Returns all doctor fields matching the patient booking flow.
 */
export const getHospitalDoctorsForReceptionist = async (receptionistUserId: number) => {
  const context = await getReceptionistContext(receptionistUserId);
  if (!context) return [];

  // Use the same function as patient booking flow to get all doctor details
  const doctorsInHospital = await getDoctorsByHospital(context.hospitalId);

  // Return all fields (same as patient booking flow) - no need to filter fields
  return doctorsInHospital.filter((doc) => doc.userId);
};

export interface WalkInRegistrationInput {
  fullName: string;
  mobileNumber: string;
  email?: string;
  reason?: string;
  doctorId: number;
  priority?: string;
  notes?: string | null;
  appointmentDate?: string;
  startTime?: string;
  durationMinutes?: number;
}

export const registerWalkInPatient = async (
  receptionistUserId: number,
  payload: WalkInRegistrationInput
) => {
  const context = await getReceptionistContext(receptionistUserId);
  if (!context) {
    throw new Error('Receptionist profile not found');
  }

  const {
    fullName,
    mobileNumber,
    email,
    reason,
    doctorId,
    priority = 'normal',
    notes,
    appointmentDate,
    startTime,
    durationMinutes = 30,
  } = payload;

  const trimmedMobile = mobileNumber.trim();

  const doctorUsers = alias(users, 'doctor_users');

  const [doctorRecord] = await db
    .select({
      doctor: doctors,
      doctorUserId: doctorUsers.id,
      doctorFullName: doctorUsers.fullName,
    })
    .from(doctors)
    .innerJoin(doctorUsers, eq(doctors.userId, doctorUsers.id))
    .where(eq(doctors.id, doctorId))
    .limit(1);

  if (!doctorRecord) {
    throw new Error('Doctor not found');
  }

  const doctor = doctorRecord.doctor;
  const doctorFullName = doctorRecord.doctorFullName;
  const doctorUserId = doctorRecord.doctorUserId;

  if (doctor.hospitalId !== context.hospitalId) {
    throw new Error('Doctor does not belong to your hospital');
  }

  // Find or create user
  let [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.mobileNumber, trimmedMobile))
    .limit(1);

  if (!existingUser) {
    let generatedEmail = (email && email.trim()) || `${trimmedMobile}@walkin.nexacare.local`;
    let emailAttempt = generatedEmail;
    let counter = 1;

    while (true) {
      const [emailUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, emailAttempt))
        .limit(1);
      if (!emailUser) break;
      emailAttempt = `${generatedEmail.split('@')[0]}+${counter}@${generatedEmail.split('@')[1]}`;
      counter += 1;
    }

    const passwordToHash = `WalkIn@${trimmedMobile.slice(-4)}${counter}`;
    const hashedPassword = await hashPassword(passwordToHash);

    const [createdUser] = await db
      .insert(users)
      .values({
        fullName,
        mobileNumber: trimmedMobile,
        email: emailAttempt,
        password: hashedPassword,
        role: 'patient',
        isVerified: true,
      })
      .returning();

    existingUser = createdUser;
  }

  let [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, existingUser.id))
    .limit(1);

  if (!patient) {
    const [createdPatient] = await db
      .insert(patients)
      .values({
        userId: existingUser.id,
        emergencyContact: trimmedMobile,
        emergencyContactName: fullName,
        emergencyRelation: 'Self',
        createdAt: new Date(),
      })
      .returning();
    patient = createdPatient;
  }

  const now = new Date();
  let scheduledDate: Date;
  if (appointmentDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      const [year, month, day] = appointmentDate.split('-').map((value) => parseInt(value, 10));
      scheduledDate = new Date();
      scheduledDate.setFullYear(year, (month || 1) - 1, day || new Date().getDate());
      scheduledDate.setHours(0, 0, 0, 0);
    } else {
      scheduledDate = new Date(appointmentDate);
    }
  } else {
    scheduledDate = new Date(now);
  }

  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error('Invalid appointment date');
  }

  const [startHour, startMinute] = (startTime || '09:00').split(':').map((value) => parseInt(value, 10));
  const startDateTime = new Date(scheduledDate);
  startDateTime.setHours(startHour || 9, startMinute || 0, 0, 0);

  const duration = Math.max(Number(durationMinutes) || 30, 5);
  const milliseconds = duration * 60 * 1000;
  const endDateTime = new Date(startDateTime.getTime() + milliseconds);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    });

  const timeLabel = formatTime(startDateTime);
  const slotLabel = `${formatTime(startDateTime)} - ${formatTime(endDateTime)}`;

  const [appointment] = await db
    .insert(appointments)
    .values({
      patientId: patient.id,
      doctorId: doctor.id,
      hospitalId: context.hospitalId,
      appointmentDate: startDateTime,
      appointmentTime: timeLabel,
      timeSlot: slotLabel,
      reason: reason ?? null,
      notes: notes ?? null,
      status: 'pending',
      type: 'walk-in',
      priority,
      createdBy: receptionistUserId,
      createdAt: now,
    })
    .returning();

  await createNotification({
    userId: existingUser.id,
    type: 'walkin_registered',
    title: 'Walk-in Registration',
    message: 'Your walk-in registration is confirmed at the reception.',
  });

  if (doctorUserId) {
    await createNotification({
      userId: doctorUserId,
      type: 'walkin_registered',
      title: 'Walk-in patient waiting',
      message: `${fullName} has been registered as a walk-in patient.`,
    });
  }

  return {
    id: appointment.id,
    patientName: existingUser.fullName,
    patientPhone: existingUser.mobileNumber,
    doctorId: doctor.id,
    doctorName: doctorFullName,
    reason: appointment.reason,
    status: appointment.status,
    priority: appointment.priority,
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
    timeSlot: appointment.timeSlot,
    createdAt: appointment.createdAt,
    durationMinutes: duration,
  };
};

export const searchPatientsForReceptionist = async (
  receptionistUserId: number,
  query: string
) => {
  try {
    const context = await getReceptionistContext(receptionistUserId);
    if (!context) {
      console.log('⚠️ Receptionist context not found for user:', receptionistUserId);
      return [];
    }

    const trimmed = query.trim();
    if (!trimmed) return [];

    console.log(`🔍 Searching patients with query: "${trimmed}"`);

    const namePattern = `%${trimmed}%`;
    // Only treat as patient ID when it's a SHORT numeric string (max 9 digits).
    // 10-digit numbers are mobile numbers and must NEVER be compared to patients.id (32-bit int overflow).
    const MAX_SAFE_PATIENT_ID = 2147483647; // PostgreSQL integer max
    let patientIdMatch: number | null = null;
    if (trimmed.length <= 9 && /^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num >= 1 && num <= MAX_SAFE_PATIENT_ID) {
        patientIdMatch = num;
      }
    }

    // Build search conditions: always name + mobile; add patient ID only for short numeric (max 9 digits)
    const searchConditions: (ReturnType<typeof ilike> | ReturnType<typeof eq>)[] = [
      ilike(users.fullName, namePattern),
      ilike(users.mobileNumber, `${trimmed}%`),
    ];
    if (patientIdMatch != null) {
      searchConditions.push(eq(patients.id, patientIdMatch));
    }

    const results = await db
      .select({
        userId: users.id,
        patientId: patients.id,
        fullName: users.fullName,
        mobileNumber: users.mobileNumber,
        email: users.email,
      })
      .from(users)
      .innerJoin(patients, eq(users.id, patients.userId))
      .where(
        and(
          sql`lower(${users.role}) = 'patient'`,
          or(...searchConditions)
        )
      )
      .orderBy(asc(users.fullName))
      .limit(25);

    console.log(`✅ Found ${results.length} patients matching "${trimmed}"`);
    return results;
  } catch (error) {
    console.error('❌ Error searching patients:', error);
    throw error;
  }
};

export async function getReceptionistContext(receptionistUserId: number) {
  const [rec] = await db
    .select()
    .from(receptionists)
    .where(eq(receptionists.userId, receptionistUserId))
    .limit(1);

  if (!rec) return null;

  return rec;
}

/**
 * Get receptionist profile by user ID (including hospital name)
 * Similar to getDoctorByUserId - fetches receptionist data and hospital name
 */
export async function getReceptionistByUserId(userId: number) {
  try {
    // First, get the receptionist data
    const [receptionistData] = await db
      .select()
      .from(receptionists)
      .where(eq(receptionists.userId, userId))
      .limit(1);
    
    if (!receptionistData) {
      console.log(`⚠️ No receptionist found for user ID ${userId}`);
      return null;
    }
    
    // Then, get the hospital name if hospitalId exists
    let hospitalName: string | null = null;
    if (receptionistData.hospitalId) {
      const [hospital] = await db
        .select({ name: hospitals.name })
        .from(hospitals)
        .where(eq(hospitals.id, receptionistData.hospitalId))
        .limit(1);
      
      hospitalName = hospital?.name || null;
    }
    
    // Combine the results
    const receptionist = {
      ...receptionistData,
      hospitalName,
    };
    
    return receptionist;
  } catch (error: any) {
    console.error(`❌ Error fetching receptionist by user ID ${userId}:`, error);
    throw error;
  }
}

/**
 * Get comprehensive patient information including profile, lab tests, prescriptions, and history.
 */
/**
 * Lookup user and patient by mobile number for walk-in registration.
 */
export async function lookupUserByMobile(mobileNumber: string) {
  console.log(`🔍 Looking up user by mobile number: ${mobileNumber}`);
  
  try {
    // Validate mobile number format
    if (!mobileNumber || typeof mobileNumber !== 'string') {
      throw new Error('Invalid mobile number');
    }

    const trimmedMobile = mobileNumber.trim();
    if (trimmedMobile.length < 10 || trimmedMobile.length > 15) {
      throw new Error('Invalid mobile number length');
    }

    // Use a single optimized query with LEFT JOIN to get both user and patient in one query
    console.log(`🔍 Executing optimized lookup query for: ${trimmedMobile}`);
    const startTime = Date.now();
    
    const result = await db
      .select({
        user: users,
        patient: patients,
      })
      .from(users)
      .leftJoin(patients, eq(users.id, patients.userId))
      .where(eq(users.mobileNumber, trimmedMobile))
      .limit(1);
    
    const queryTime = Date.now() - startTime;
    console.log(`⏱️ Lookup query took ${queryTime}ms`);

    if (result.length === 0) {
      console.log(`ℹ️  No user found for mobile: ${trimmedMobile}`);
      return { user: null, patient: null };
    }

    const row = result[0];
    const user = row.user ? {
      id: row.user.id,
      fullName: row.user.fullName,
      mobileNumber: row.user.mobileNumber,
      email: row.user.email,
      role: row.user.role,
    } : null;

    if (!user) {
      console.log(`ℹ️  No user found for mobile: ${trimmedMobile}`);
      return { user: null, patient: null };
    }

    console.log(`✅ User found: ${user.fullName} (ID: ${user.id})`);

    const patient = row.patient || null;

    if (patient) {
      console.log(`✅ Patient profile found: ${patient.id}`);
    } else {
      console.log(`ℹ️  No patient profile found for user: ${user.id}`);
    }

    return {
      user,
      patient,
    };
  } catch (error: any) {
    console.error(`❌ Error looking up user by mobile ${mobileNumber}:`, error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    });
    // Provide more specific error messages
    if (error.message?.includes('timeout') || error.message?.includes('CONNECT_TIMEOUT')) {
      throw new Error('Database connection timeout. Please try again.');
    }
    if (error.message?.includes('Invalid')) {
      throw new Error(error.message);
    }
    throw new Error(`Failed to lookup user: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Quick-create minimal user + patient for IPD admission (receptionist).
 * Used when patient is not found by mobile; create basic profile so admission can proceed; rest can be filled later.
 */
export async function quickCreatePatientForAdmission(receptionistUserId: number, payload: {
  fullName: string;
  mobileNumber: string;
  gender?: string | null;
  dateOfBirth?: string | null;
}) {
  const trimmedMobile = payload.mobileNumber.trim();
  if (trimmedMobile.length < 10 || trimmedMobile.length > 15) {
    throw new Error('Invalid mobile number length');
  }
  const fullName = (payload.fullName || '').trim();
  if (fullName.length < 2) {
    throw new Error('Full name is required (at least 2 characters)');
  }

  let [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.mobileNumber, trimmedMobile))
    .limit(1);

  if (!existingUser) {
    let generatedEmail = `${trimmedMobile}@ipd.nexacare.local`;
    let emailAttempt = generatedEmail;
    let counter = 1;
    while (true) {
      const [emailUser] = await db.select().from(users).where(eq(users.email, emailAttempt)).limit(1);
      if (!emailUser) break;
      emailAttempt = `${generatedEmail.split('@')[0]}+${counter}@${generatedEmail.split('@')[1]}`;
      counter += 1;
    }
    const passwordToHash = `Ipd@${trimmedMobile.slice(-4)}${counter}`;
    const hashedPassword = await hashPassword(passwordToHash);
    const [createdUser] = await db
      .insert(users)
      .values({
        fullName,
        mobileNumber: trimmedMobile,
        email: emailAttempt,
        password: hashedPassword,
        role: 'patient',
        isVerified: true,
      })
      .returning();
    existingUser = createdUser;
  }

  let [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, existingUser.id))
    .limit(1);

  if (!patient) {
    const dob = payload.dateOfBirth
      ? (payload.dateOfBirth.includes('-') ? new Date(payload.dateOfBirth) : new Date(payload.dateOfBirth))
      : null;
    const [createdPatient] = await db
      .insert(patients)
      .values({
        userId: existingUser.id,
        dateOfBirth: dob && !Number.isNaN(dob.getTime()) ? dob : null,
        gender: payload.gender && payload.gender.trim() ? payload.gender.trim() : null,
        emergencyContact: trimmedMobile,
        emergencyContactName: fullName,
        emergencyRelation: 'Self',
      })
      .returning();
    patient = createdPatient;
  }

  return {
    user: {
      id: existingUser.id,
      fullName: existingUser.fullName,
      mobileNumber: existingUser.mobileNumber,
      email: existingUser.email,
      role: existingUser.role,
    },
    patient: { id: patient.id, userId: patient.userId },
  };
}

export async function getPatientInfo(patientId: number) {
  console.log(`📋 Fetching comprehensive patient info for patient ${patientId}`);
  
  try {
    // Get patient profile
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      console.log(`⚠️ Patient ${patientId} not found`);
      return null;
    }

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        mobileNumber: users.mobileNumber,
      })
      .from(users)
      .where(eq(users.id, patient.userId))
      .limit(1);

    // Get lab reports
    const labReportsList = await db
      .select()
      .from(labReports)
      .where(eq(labReports.patientId, patientId))
      .orderBy(desc(labReports.reportDate));

    // Get current IPD admission status
    const { ipdEncounters } = await import('../../shared/schema');
    const { isNull: isNullFn } = await import('drizzle-orm');
    const currentIpdEncounter = await db
      .select({
        encounter: ipdEncounters,
      })
      .from(ipdEncounters)
      .where(
        and(
          eq(ipdEncounters.patientId, patientId),
          sql`${ipdEncounters.status} IN ('admitted', 'transferred')`
        )
      )
      .orderBy(desc(ipdEncounters.admittedAt))
      .limit(1);

    let ipdStatus = null;
    let attendingDoctor = null;
    let admittingDoctor = null;
    
    if (currentIpdEncounter.length > 0) {
      const enc = currentIpdEncounter[0].encounter;
      ipdStatus = {
        isAdmitted: true,
        status: enc.status,
        admittedAt: enc.admittedAt,
        encounterId: enc.id,
      };
      
      // Get attending and admitting doctors
      if (enc.attendingDoctorId) {
        const { doctors } = await import('../../shared/schema');
        const { users } = await import('../../shared/schema');
        const [attendingDoc] = await db
          .select({
            doctor: doctors,
            user: users,
          })
          .from(doctors)
          .leftJoin(users, eq(doctors.userId, users.id))
          .where(eq(doctors.id, enc.attendingDoctorId))
          .limit(1);
        if (attendingDoc?.user) {
          attendingDoctor = {
            id: attendingDoc.doctor.id,
            name: attendingDoc.user.fullName,
          };
        }
      }
      
      if (enc.admittingDoctorId) {
        const { doctors } = await import('../../shared/schema');
        const { users } = await import('../../shared/schema');
        const [admittingDoc] = await db
          .select({
            doctor: doctors,
            user: users,
          })
          .from(doctors)
          .leftJoin(users, eq(doctors.userId, users.id))
          .where(eq(doctors.id, enc.admittingDoctorId))
          .limit(1);
        if (admittingDoc?.user) {
          admittingDoctor = {
            id: admittingDoc.doctor.id,
            name: admittingDoc.user.fullName,
          };
        }
      }
    }

    // Get prescriptions - limit to last 30 for performance, but show all active ones
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const allPrescriptions = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));
    
    // Prioritize active prescriptions, then recent ones (last 6 months), then limit to 30
    const activePrescriptions = allPrescriptions.filter(p => p.isActive !== false);
    const recentPrescriptions = allPrescriptions.filter(p => {
      const createdAt = p.createdAt ? new Date(p.createdAt) : null;
      return createdAt && createdAt >= sixMonthsAgo;
    });
    
    // Combine: all active + recent (up to 30 total)
    const prescriptionSet = new Set();
    const prescriptionsList: any[] = [];
    
    // First add all active prescriptions
    activePrescriptions.forEach(p => {
      if (!prescriptionSet.has(p.id) && prescriptionsList.length < 30) {
        prescriptionSet.add(p.id);
        prescriptionsList.push(p);
      }
    });
    
    // Then add recent ones
    recentPrescriptions.forEach(p => {
      if (!prescriptionSet.has(p.id) && prescriptionsList.length < 30) {
        prescriptionSet.add(p.id);
        prescriptionsList.push(p);
      }
    });
    
    // Sort by creation date descending
    prescriptionsList.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Get appointments history - last 30 appointments
    const appointmentsHistory = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        timeSlot: appointments.timeSlot,
        reason: appointments.reason,
        status: appointments.status,
        doctorName: users.fullName,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.appointmentDate))
      .limit(30); // Last 30 appointments

    // Get total counts for UI display
    const [appointmentsCountResult] = await db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.patientId, patientId));
    
    const appointmentsTotal = appointmentsCountResult?.count || 0;

    return {
      patient: {
        ...patient,
        user: user || null,
      },
      ipdStatus, // Current IPD admission status
      attendingDoctor, // Attending doctor info if admitted
      admittingDoctor, // Admitting doctor info if admitted
      labReports: labReportsList,
      prescriptions: prescriptionsList,
      prescriptionsTotal: allPrescriptions.length, // Total count for UI display
      appointments: appointmentsHistory,
      appointmentsTotal, // Total count for UI display
    };
  } catch (error) {
    console.error(`❌ Error fetching patient info for patient ${patientId}:`, error);
    throw error;
  }
}
