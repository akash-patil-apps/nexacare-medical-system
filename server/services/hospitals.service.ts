// server/services/hospitals.service.ts
import { db } from '../db';
import { hospitals, doctors, appointments, patients } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { InsertHospital } from '../../shared/schema-types';
import { labs } from '../../shared/schema';


/**
 * Fetch all hospitals from DB.
 */
export const getAllHospitals = async () => {
  try {
    console.log('🏥 Fetching all hospitals from database...');
    const result = await db.select().from(hospitals);
    console.log(`✅ Found ${result.length} hospitals in database`);
    if (result.length > 0) {
      console.log('📍 Sample cities:', [...new Set(result.slice(0, 10).map(h => h.city))]);
    }
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
    console.log(`📊 Fetching stats for hospital ${hospitalId}`);
    
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
    
    // Calculate revenue (mock calculation - can be enhanced with actual payment data)
    // For now, estimate: completed appointments * average consultation fee
    const doctorsWithFees = await db
      .select({ consultationFee: doctors.consultationFee })
      .from(doctors)
      .where(eq(doctors.hospitalId, hospitalId));
    
    const avgFee = doctorsWithFees.length > 0
      ? doctorsWithFees.reduce((sum, d) => {
          const fee = d.consultationFee ? parseFloat(d.consultationFee.toString()) : 500;
          return sum + fee;
        }, 0) / doctorsWithFees.length
      : 500; // Default average fee
    
    // Monthly revenue (completed appointments this month * average fee)
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const monthlyCompleted = allAppointments.filter(apt => {
      if (apt.status !== 'completed') return false;
      const aptDate = new Date(apt.appointmentDate);
      return aptDate >= thisMonth;
    }).length;
    
    const monthlyRevenue = Math.round(monthlyCompleted * avgFee);
    
    const stats = {
      totalDoctors,
      totalPatients,
      totalAppointments,
      todayAppointments: todayAppointments.length,
      upcomingAppointments: upcomingAppointments.length, // Today + future appointments
      completedAppointments,
      pendingAppointments,
      confirmedAppointments,
      totalRevenue: monthlyRevenue,
    };
    
    console.log(`✅ Hospital stats calculated:`, stats);
    return stats;
  } catch (error) {
    console.error('❌ Error calculating hospital stats:', error);
    throw error;
  }
};