// server/services/hospitals.service.ts
import { db } from '../db';
import { hospitals, doctors, nurses, receptionists, pharmacists, radiologyTechnicians, users, appointments, patients, payments, invoices } from '../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import type { InsertHospital } from '../../shared/schema-types';
import { labs } from '../../shared/schema';


/**
 * Fetch all hospitals from DB.
 */
export const getAllHospitals = async () => {
  try {
    const result = await db.select().from(hospitals);
    return result;
  } catch (error) {
    console.error('❌ Error fetching hospitals:', error);
    throw error;
  }
};

/**
 * Create a new hospital record.
 */
export const createHospital = async (hospital: Omit<InsertHospital, 'id' | 'createdAt'>) => {
  return db.insert(hospitals).values(hospital).returning();
};

/**
 * Verify a hospital's identity.
 */
export const verifyHospital = async (hospitalId: number) => {
  return db.update(hospitals).set({ isVerified: true }).where(eq(hospitals.id, hospitalId)).returning();
};

export const approveDoctor = async (doctorId: number) => {
  return db.update(doctors).set({ approvalStatus: 'approved' }).where(eq(doctors.id, doctorId)).returning();
};

export const approveLab = async (labId: number) => {
  return db.update(labs).set({ approvalStatus: 'approved' }).where(eq(labs.id, labId)).returning();
};

/**
 * Get hospital by ID
 */
export const getHospitalById = async (hospitalId: number) => {
  const result = await db.select().from(hospitals).where(eq(hospitals.id, hospitalId)).limit(1);
  return result[0] || null;
};

/**
 * Get hospital statistics for dashboard
 */
export const getHospitalStats = async (hospitalId: number) => {
  try {
    // Get total doctors in hospital
    const doctorsList = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.hospitalId, hospitalId));
    const totalDoctors = doctorsList.length;
    
    // Get unique patients who have appointments at this hospital
    const uniquePatients = await db
      .select({ patientId: appointments.patientId })
      .from(appointments)
      .where(eq(appointments.hospitalId, hospitalId));
    const uniquePatientIds = [...new Set(uniquePatients.map(p => p.patientId))];
    const totalPatients = uniquePatientIds.length;
    
    // Get all appointments for hospital
    const allAppointments = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        appointmentDate: appointments.appointmentDate,
      })
      .from(appointments)
      .where(eq(appointments.hospitalId, hospitalId));
    
    const totalAppointments = allAppointments.length;
    
    // Get today's appointments (for today's count)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAppointments = allAppointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === today.getTime();
    });
    
    // Get upcoming appointments (today and future) - matches what's shown in the table
    const now = new Date();
    const upcomingAppointments = allAppointments.filter(apt => {
      try {
        const aptDate = new Date(apt.appointmentDate);
        if (isNaN(aptDate.getTime())) return false;
        
        // If appointment has time info, use it; otherwise just compare dates
        let appointmentDateTime = new Date(aptDate);
        
        // Try to parse time if available (from appointmentTime or timeSlot fields)
        // For now, just compare dates - appointments today or in future
        appointmentDateTime.setHours(0, 0, 0, 0);
        const todayDate = new Date(now);
        todayDate.setHours(0, 0, 0, 0);
        
        return appointmentDateTime >= todayDate;
      } catch (error) {
        return false;
      }
    });
    
    // Count appointments by status
    const completedAppointments = allAppointments.filter(apt => apt.status === 'completed').length;
    const pendingAppointments = allAppointments.filter(apt => apt.status === 'pending').length;
    const confirmedAppointments = allAppointments.filter(apt => apt.status === 'confirmed').length;
    
    // Calculate revenue from actual payments
    // Get all payments for this hospital's invoices
    const allPayments = await db
      .select({
        amount: payments.amount,
        receivedAt: payments.receivedAt,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(eq(invoices.hospitalId, hospitalId));
    
    // Calculate daily revenue (today) - reuse existing 'today' variable
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dailyRevenue = allPayments
      .filter(p => {
        if (!p.receivedAt) return false;
        const paymentDate = new Date(p.receivedAt);
        paymentDate.setHours(0, 0, 0, 0);
        const isToday = paymentDate.getTime() >= today.getTime() && paymentDate.getTime() < tomorrow.getTime();
        return isToday;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    
    // Calculate weekly revenue (this week, Sunday to Saturday) - reuse existing 'now' variable
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weeklyRevenue = allPayments
      .filter(p => {
        const paymentDate = new Date(p.receivedAt);
        return paymentDate >= weekStart;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    
    // Calculate monthly revenue (this month)
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const monthlyRevenue = allPayments
      .filter(p => {
        const paymentDate = new Date(p.receivedAt);
        return paymentDate >= thisMonth;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    
    const stats = {
      totalDoctors,
      totalPatients,
      totalAppointments,
      todayAppointments: todayAppointments.length,
      upcomingAppointments: upcomingAppointments.length, // Today + future appointments
      completedAppointments,
      pendingAppointments,
      confirmedAppointments,
      totalRevenue: monthlyRevenue, // Keep for backward compatibility
      monthlyRevenue,
      dailyRevenue,
      weeklyRevenue,
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error calculating hospital stats:', error);
    throw error;
  }
};

export type StaffRole = 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'radiology_technician';

export interface StaffMember {
  id: number;
  userId: number;
  role: StaffRole;
  fullName: string;
  email: string;
  mobileNumber: string;
  [key: string]: unknown;
}

/**
 * Get all staff for a hospital (doctors, nurses, receptionists, pharmacists, radiology technicians) with user info.
 */
export const getHospitalStaff = async (hospitalId: number): Promise<{
  doctors: StaffMember[];
  nurses: StaffMember[];
  receptionists: StaffMember[];
  pharmacists: StaffMember[];
  radiologyTechnicians: StaffMember[];
}> => {
  const [doctorsRows, nursesRows, receptionistsRows, pharmacistsRows, radiologyRows] = await Promise.all([
    db.select({
      id: doctors.id,
      userId: doctors.userId,
      fullName: users.fullName,
      email: users.email,
      mobileNumber: users.mobileNumber,
      specialty: doctors.specialty,
      licenseNumber: doctors.licenseNumber,
      isAvailable: doctors.isAvailable,
    })
      .from(doctors)
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.hospitalId, hospitalId)),
    db.select({
      id: nurses.id,
      userId: nurses.userId,
      fullName: users.fullName,
      email: users.email,
      mobileNumber: users.mobileNumber,
      nursingDegree: nurses.nursingDegree,
      licenseNumber: nurses.licenseNumber,
      isAvailable: nurses.isAvailable,
    })
      .from(nurses)
      .leftJoin(users, eq(nurses.userId, users.id))
      .where(and(eq(nurses.hospitalId, hospitalId), eq(nurses.isAvailable, true))),
    db.select({
      id: receptionists.id,
      userId: receptionists.userId,
      fullName: users.fullName,
      email: users.email,
      mobileNumber: users.mobileNumber,
      department: receptionists.department,
      employeeId: receptionists.employeeId,
      isActive: receptionists.isActive,
    })
      .from(receptionists)
      .leftJoin(users, eq(receptionists.userId, users.id))
      .where(and(eq(receptionists.hospitalId, hospitalId), eq(receptionists.isActive, true))),
    db.select({
      id: pharmacists.id,
      userId: pharmacists.userId,
      fullName: users.fullName,
      email: users.email,
      mobileNumber: users.mobileNumber,
      pharmacyDegree: pharmacists.pharmacyDegree,
      licenseNumber: pharmacists.licenseNumber,
      isAvailable: pharmacists.isAvailable,
    })
      .from(pharmacists)
      .leftJoin(users, eq(pharmacists.userId, users.id))
      .where(and(eq(pharmacists.hospitalId, hospitalId), eq(pharmacists.isAvailable, true))),
    db.select({
      id: radiologyTechnicians.id,
      userId: radiologyTechnicians.userId,
      fullName: users.fullName,
      email: users.email,
      mobileNumber: users.mobileNumber,
      radiologyDegree: radiologyTechnicians.radiologyDegree,
      licenseNumber: radiologyTechnicians.licenseNumber,
      isAvailable: radiologyTechnicians.isAvailable,
    })
      .from(radiologyTechnicians)
      .leftJoin(users, eq(radiologyTechnicians.userId, users.id))
      .where(and(eq(radiologyTechnicians.hospitalId, hospitalId), eq(radiologyTechnicians.isAvailable, true))),
  ]);

  const toStaff = (role: StaffRole) => (row: Record<string, unknown>): StaffMember => ({
    id: row.id as number,
    userId: row.userId as number,
    role,
    fullName: (row.fullName as string) ?? '',
    email: (row.email as string) ?? '',
    mobileNumber: (row.mobileNumber as string) ?? '',
    ...row,
  });

  return {
    doctors: doctorsRows.map(toStaff('doctor')),
    nurses: nursesRows.map(toStaff('nurse')),
    receptionists: receptionistsRows.map(toStaff('receptionist')),
    pharmacists: pharmacistsRows.map(toStaff('pharmacist')),
    radiologyTechnicians: radiologyRows.map(toStaff('radiology_technician')),
  };
};

/**
 * Remove (deactivate or unlink) a staff member from the hospital.
 * - Doctor: set hospitalId = null (unlink).
 * - Nurse, receptionist, pharmacist, radiology_technician: set isAvailable/isActive = false.
 */
export const removeStaffMember = async (
  role: StaffRole,
  staffId: number,
  hospitalId: number
): Promise<boolean> => {
  const id = Number(staffId);
  const hid = Number(hospitalId);
  if (!id || !hid) return false;

  switch (role) {
    case 'doctor': {
      const [updated] = await db
        .update(doctors)
        .set({ hospitalId: null })
        .where(and(eq(doctors.id, id), eq(doctors.hospitalId, hid)))
        .returning({ id: doctors.id });
      return !!updated;
    }
    case 'nurse': {
      const [updated] = await db
        .update(nurses)
        .set({ isAvailable: false })
        .where(and(eq(nurses.id, id), eq(nurses.hospitalId, hid)))
        .returning({ id: nurses.id });
      return !!updated;
    }
    case 'receptionist': {
      const [updated] = await db
        .update(receptionists)
        .set({ isActive: false })
        .where(and(eq(receptionists.id, id), eq(receptionists.hospitalId, hid)))
        .returning({ id: receptionists.id });
      return !!updated;
    }
    case 'pharmacist': {
      const [updated] = await db
        .update(pharmacists)
        .set({ isAvailable: false })
        .where(and(eq(pharmacists.id, id), eq(pharmacists.hospitalId, hid)))
        .returning({ id: pharmacists.id });
      return !!updated;
    }
    case 'radiology_technician': {
      const [updated] = await db
        .update(radiologyTechnicians)
        .set({ isAvailable: false })
        .where(and(eq(radiologyTechnicians.id, id), eq(radiologyTechnicians.hospitalId, hid)))
        .returning({ id: radiologyTechnicians.id });
      return !!updated;
    }
    default:
      return false;
  }
};