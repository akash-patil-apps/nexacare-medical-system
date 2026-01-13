// server/services/hospitals.service.ts
import { db } from '../db';
import { hospitals, doctors, appointments, patients, payments, invoices } from '../../shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
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
    
    console.log(`💰 Found ${allPayments.length} total payments for hospital ${hospitalId}`);
    
    // Calculate daily revenue (today) - reuse existing 'today' variable
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dailyRevenue = allPayments
      .filter(p => {
        if (!p.receivedAt) return false;
        const paymentDate = new Date(p.receivedAt);
        paymentDate.setHours(0, 0, 0, 0);
        const isToday = paymentDate.getTime() >= today.getTime() && paymentDate.getTime() < tomorrow.getTime();
        if (isToday) {
          console.log(`✅ Daily payment: ₹${p.amount} on ${paymentDate.toISOString()}`);
        }
        return isToday;
      })
      .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    
    console.log(`💰 Daily revenue: ₹${dailyRevenue}`);
    
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
    
    console.log(`✅ Hospital stats calculated:`, stats);
    return stats;
  } catch (error) {
    console.error('❌ Error calculating hospital stats:', error);
    throw error;
  }
};