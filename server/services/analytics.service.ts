// Advanced Analytics service for NexaCare Medical System
// Provides trend analysis, forecasting, and enhanced metrics

import { db } from '../db';
import {
  appointments,
  invoices,
  payments,
  labOrders,
  ipdEncounters,
  prescriptions,
  patients,
  doctors,
  users,
} from '../../shared/schema';
import { eq, and, gte, lte, sql, desc, count, between } from 'drizzle-orm';

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TrendAnalysis {
  dataPoints: TrendDataPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  growthRate: number; // Percentage
  average: number;
  min: number;
  max: number;
  forecast?: TrendDataPoint[]; // Next 7-30 days forecast
}

export interface PerformanceMetrics {
  revenue: {
    total: number;
    growth: number;
    averageDaily: number;
    peakDay: { date: string; amount: number };
  };
  appointments: {
    total: number;
    growth: number;
    averageDaily: number;
    completionRate: number;
    noShowRate: number;
  };
  patients: {
    total: number;
    new: number;
    returning: number;
    retentionRate: number;
  };
  doctors: {
    total: number;
    averageLoad: number;
    topPerformers: Array<{ doctorId: number; name: string; appointments: number; revenue: number }>;
  };
}

/**
 * Get trend analysis for revenue
 */
export const getRevenueTrend = async (filters: {
  hospitalId: number;
  dateFrom: Date;
  dateTo: Date;
  period: 'daily' | 'weekly' | 'monthly';
}): Promise<TrendAnalysis> => {
  const { hospitalId, dateFrom, dateTo, period } = filters;

  // Get all payments in the date range
  const allPayments = await db
    .select({
      amount: payments.amount,
      receivedAt: payments.receivedAt,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.hospitalId, hospitalId),
        gte(sql`DATE(${payments.receivedAt})`, dateFrom),
        lte(sql`DATE(${payments.receivedAt})`, dateTo)
      )
    );

  // Group by period
  const grouped: Record<string, number> = {};
  allPayments.forEach((pay: any) => {
    const date = pay.receivedAt instanceof Date ? pay.receivedAt : new Date(pay.receivedAt);
    let key: string;

    if (period === 'daily') {
      key = date.toISOString().slice(0, 10);
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    grouped[key] = (grouped[key] || 0) + parseFloat(pay.amount || '0');
  });

  // Convert to data points
  const dataPoints: TrendDataPoint[] = Object.entries(grouped)
    .map(([date, value]) => ({
      date,
      value,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate trend
  if (dataPoints.length < 2) {
    return {
      dataPoints,
      trend: 'stable',
      growthRate: 0,
      average: dataPoints[0]?.value || 0,
      min: dataPoints[0]?.value || 0,
      max: dataPoints[0]?.value || 0,
    };
  }

  const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
  const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

  const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  const trend: 'increasing' | 'decreasing' | 'stable' =
    growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable';

  const values = dataPoints.map((d) => d.value);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Simple forecast (linear projection)
  const forecast: TrendDataPoint[] = [];
  if (dataPoints.length >= 2) {
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const secondLastValue = dataPoints[dataPoints.length - 2].value;
    const dailyChange = (lastValue - secondLastValue) / (period === 'daily' ? 1 : period === 'weekly' ? 7 : 30);

    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(dataPoints[dataPoints.length - 1].date);
      forecastDate.setDate(forecastDate.getDate() + i);
      forecast.push({
        date: forecastDate.toISOString().slice(0, 10),
        value: Math.max(0, lastValue + dailyChange * i),
        label: 'Forecast',
      });
    }
  }

  return {
    dataPoints,
    trend,
    growthRate: Math.round(growthRate * 100) / 100,
    average: Math.round(average * 100) / 100,
    min,
    max,
    forecast,
  };
};

/**
 * Get trend analysis for appointments
 */
export const getAppointmentTrend = async (filters: {
  hospitalId: number;
  dateFrom: Date;
  dateTo: Date;
  period: 'daily' | 'weekly' | 'monthly';
}): Promise<TrendAnalysis> => {
  const { hospitalId, dateFrom, dateTo, period } = filters;

  const allAppointments = await db
    .select({
      appointmentDate: appointments.appointmentDate,
      status: appointments.status,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.hospitalId, hospitalId),
        gte(sql`DATE(${appointments.appointmentDate})`, dateFrom),
        lte(sql`DATE(${appointments.appointmentDate})`, dateTo)
      )
    );

  // Group by period
  const grouped: Record<string, number> = {};
  allAppointments.forEach((apt: any) => {
    const date = apt.appointmentDate instanceof Date ? apt.appointmentDate : new Date(apt.appointmentDate);
    let key: string;

    if (period === 'daily') {
      key = date.toISOString().slice(0, 10);
    } else if (period === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    grouped[key] = (grouped[key] || 0) + 1;
  });

  const dataPoints: TrendDataPoint[] = Object.entries(grouped)
    .map(([date, value]) => ({
      date,
      value,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate trend (similar to revenue)
  if (dataPoints.length < 2) {
    return {
      dataPoints,
      trend: 'stable',
      growthRate: 0,
      average: dataPoints[0]?.value || 0,
      min: dataPoints[0]?.value || 0,
      max: dataPoints[0]?.value || 0,
    };
  }

  const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
  const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

  const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  const trend: 'increasing' | 'decreasing' | 'stable' =
    growthRate > 5 ? 'increasing' : growthRate < -5 ? 'decreasing' : 'stable';

  const values = dataPoints.map((d) => d.value);
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Forecast
  const forecast: TrendDataPoint[] = [];
  if (dataPoints.length >= 2) {
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const secondLastValue = dataPoints[dataPoints.length - 2].value;
    const dailyChange = (lastValue - secondLastValue) / (period === 'daily' ? 1 : period === 'weekly' ? 7 : 30);

    for (let i = 1; i <= 7; i++) {
      const forecastDate = new Date(dataPoints[dataPoints.length - 1].date);
      forecastDate.setDate(forecastDate.getDate() + i);
      forecast.push({
        date: forecastDate.toISOString().slice(0, 10),
        value: Math.max(0, Math.round(lastValue + dailyChange * i)),
        label: 'Forecast',
      });
    }
  }

  return {
    dataPoints,
    trend,
    growthRate: Math.round(growthRate * 100) / 100,
    average: Math.round(average * 100) / 100,
    min,
    max,
    forecast,
  };
};

/**
 * Get comprehensive performance metrics
 */
export const getPerformanceMetrics = async (filters: {
  hospitalId: number;
  dateFrom: Date;
  dateTo: Date;
  compareWithPrevious?: boolean; // Compare with previous period
}): Promise<PerformanceMetrics> => {
  const { hospitalId, dateFrom, dateTo, compareWithPrevious = true } = filters;

  // Calculate period duration
  const periodDays = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
  const previousDateFrom = new Date(dateFrom);
  previousDateFrom.setDate(previousDateFrom.getDate() - periodDays);
  const previousDateTo = new Date(dateFrom);

  // Revenue metrics
  const currentPayments = await db
    .select({
      amount: payments.amount,
      receivedAt: payments.receivedAt,
    })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.hospitalId, hospitalId),
        gte(sql`DATE(${payments.receivedAt})`, dateFrom),
        lte(sql`DATE(${payments.receivedAt})`, dateTo)
      )
    );

  const previousPayments = compareWithPrevious
    ? await db
        .select({
          amount: payments.amount,
          receivedAt: payments.receivedAt,
        })
        .from(payments)
        .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
        .where(
          and(
            eq(invoices.hospitalId, hospitalId),
            gte(sql`DATE(${payments.receivedAt})`, previousDateFrom),
            lte(sql`DATE(${payments.receivedAt})`, previousDateTo)
          )
        )
    : [];

  const totalRevenue = currentPayments.reduce((sum, p: any) => sum + parseFloat(p.amount || '0'), 0);
  const previousRevenue = previousPayments.reduce((sum, p: any) => sum + parseFloat(p.amount || '0'), 0);
  const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

  // Find peak day
  const dailyRevenue: Record<string, number> = {};
  currentPayments.forEach((pay: any) => {
    const date = pay.receivedAt instanceof Date ? pay.receivedAt : new Date(pay.receivedAt);
    const dateStr = date.toISOString().slice(0, 10);
    dailyRevenue[dateStr] = (dailyRevenue[dateStr] || 0) + parseFloat(pay.amount || '0');
  });

  const peakDayEntry = Object.entries(dailyRevenue).reduce(
    (max, [date, amount]) => (amount > max[1] ? [date, amount] : max),
    ['', 0]
  );

  // Appointment metrics
  const currentAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.hospitalId, hospitalId),
        gte(sql`DATE(${appointments.appointmentDate})`, dateFrom),
        lte(sql`DATE(${appointments.appointmentDate})`, dateTo)
      )
    );

  const previousAppointments = compareWithPrevious
    ? await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.hospitalId, hospitalId),
            gte(sql`DATE(${appointments.appointmentDate})`, previousDateFrom),
            lte(sql`DATE(${appointments.appointmentDate})`, previousDateTo)
          )
        )
    : [];

  const totalAppointments = currentAppointments.length;
  const previousAppointmentsCount = previousAppointments.length;
  const appointmentGrowth = previousAppointmentsCount > 0
    ? ((totalAppointments - previousAppointmentsCount) / previousAppointmentsCount) * 100
    : 0;

  const completedAppointments = currentAppointments.filter(
    (apt: any) => apt.status === 'completed'
  ).length;
  const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

  const noShows = currentAppointments.filter((apt: any) => {
    const status = (apt.status || '').toLowerCase();
    const isConfirmed = status === 'confirmed' || status === 'pending';
    const neverCheckedIn = !apt.checkedInAt;
    const appointmentDate = apt.appointmentDate instanceof Date ? apt.appointmentDate : new Date(apt.appointmentDate);
    const isPast = appointmentDate < new Date();
    return isConfirmed && neverCheckedIn && isPast;
  }).length;
  const noShowRate = totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;

  // Patient metrics
  const currentPatients = await db
    .select()
    .from(patients)
    .innerJoin(appointments, eq(patients.id, appointments.patientId))
    .where(
      and(
        eq(appointments.hospitalId, hospitalId),
        gte(sql`DATE(${appointments.appointmentDate})`, dateFrom),
        lte(sql`DATE(${appointments.appointmentDate})`, dateTo)
      )
    );

  const uniquePatients = new Set(currentPatients.map((p: any) => p.patients.id));
  const totalPatients = uniquePatients.size;

  // Get new vs returning patients
  const patientFirstVisit: Record<number, Date> = {};
  currentPatients.forEach((p: any) => {
    const patientId = p.patients.id;
    const aptDate = p.appointments.appointmentDate instanceof Date
      ? p.appointments.appointmentDate
      : new Date(p.appointments.appointmentDate);
    if (!patientFirstVisit[patientId] || aptDate < patientFirstVisit[patientId]) {
      patientFirstVisit[patientId] = aptDate;
    }
  });

  const newPatients = Object.values(patientFirstVisit).filter(
    (date) => date >= dateFrom && date <= dateTo
  ).length;
  const returningPatients = totalPatients - newPatients;
  const retentionRate = totalPatients > 0 ? (returningPatients / totalPatients) * 100 : 0;

  // Doctor metrics
  const allDoctors = await db
    .select()
    .from(doctors)
    .where(eq(doctors.hospitalId, hospitalId));

  const doctorAppointmentCounts: Record<number, number> = {};
  const doctorRevenue: Record<number, number> = {};

  currentAppointments.forEach((apt: any) => {
    if (apt.doctorId) {
      doctorAppointmentCounts[apt.doctorId] = (doctorAppointmentCounts[apt.doctorId] || 0) + 1;
    }
  });

  // Get revenue per doctor from invoices
  const doctorInvoices = await db
    .select({
      doctorId: invoices.doctorId,
      total: invoices.total,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.hospitalId, hospitalId),
        gte(sql`DATE(${invoices.createdAt})`, dateFrom),
        lte(sql`DATE(${invoices.createdAt})`, dateTo)
      )
    );

  doctorInvoices.forEach((inv: any) => {
    if (inv.doctorId) {
      doctorRevenue[inv.doctorId] = (doctorRevenue[inv.doctorId] || 0) + parseFloat(inv.total || '0');
    }
  });

  // Get doctor names
  const doctorNames: Record<number, string> = {};
  for (const doctor of allDoctors) {
    const [user] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, doctor.userId))
      .limit(1);
    doctorNames[doctor.id] = user?.fullName || `Doctor ${doctor.id}`;
  }

  const topPerformers = Object.entries(doctorAppointmentCounts)
    .map(([doctorId, appointments]) => ({
      doctorId: +doctorId,
      name: doctorNames[+doctorId] || `Doctor ${doctorId}`,
      appointments,
      revenue: doctorRevenue[+doctorId] || 0,
    }))
    .sort((a, b) => b.appointments - a.appointments)
    .slice(0, 10);

  const averageLoad = allDoctors.length > 0
    ? totalAppointments / allDoctors.length
    : 0;

  return {
    revenue: {
      total: Math.round(totalRevenue * 100) / 100,
      growth: Math.round(revenueGrowth * 100) / 100,
      averageDaily: periodDays > 0 ? Math.round((totalRevenue / periodDays) * 100) / 100 : 0,
      peakDay: {
        date: peakDayEntry[0],
        amount: Math.round(peakDayEntry[1] * 100) / 100,
      },
    },
    appointments: {
      total: totalAppointments,
      growth: Math.round(appointmentGrowth * 100) / 100,
      averageDaily: periodDays > 0 ? Math.round((totalAppointments / periodDays) * 100) / 100 : 0,
      completionRate: Math.round(completionRate * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
    },
    patients: {
      total: totalPatients,
      new: newPatients,
      returning: returningPatients,
      retentionRate: Math.round(retentionRate * 100) / 100,
    },
    doctors: {
      total: allDoctors.length,
      averageLoad: Math.round(averageLoad * 100) / 100,
      topPerformers,
    },
  };
};

/**
 * Get department-wise performance
 */
export const getDepartmentPerformance = async (filters: {
  hospitalId: number;
  dateFrom: Date;
  dateTo: Date;
}) => {
  const { hospitalId, dateFrom, dateTo } = filters;

  const appointmentsWithDoctors = await db
    .select({
      appointmentId: appointments.id,
      doctorId: appointments.doctorId,
      specialty: doctors.specialty,
      status: appointments.status,
      appointmentDate: appointments.appointmentDate,
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(
      and(
        eq(appointments.hospitalId, hospitalId),
        gte(sql`DATE(${appointments.appointmentDate})`, dateFrom),
        lte(sql`DATE(${appointments.appointmentDate})`, dateTo)
      )
    );

  // Group by specialty
  const departmentStats: Record<
    string,
    {
      total: number;
      completed: number;
      cancelled: number;
      revenue: number;
    }
  > = {};

  appointmentsWithDoctors.forEach((apt: any) => {
    const specialty = apt.specialty || 'General';
    if (!departmentStats[specialty]) {
      departmentStats[specialty] = {
        total: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
      };
    }

    departmentStats[specialty].total += 1;
    if (apt.status === 'completed') {
      departmentStats[specialty].completed += 1;
    }
    if (apt.status === 'cancelled') {
      departmentStats[specialty].cancelled += 1;
    }
  });

  // Get revenue per department
  const departmentInvoices = await db
    .select({
      doctorId: invoices.doctorId,
      total: invoices.total,
      specialty: doctors.specialty,
    })
    .from(invoices)
    .innerJoin(doctors, eq(invoices.doctorId, doctors.id))
    .where(
      and(
        eq(invoices.hospitalId, hospitalId),
        gte(sql`DATE(${invoices.createdAt})`, dateFrom),
        lte(sql`DATE(${invoices.createdAt})`, dateTo)
      )
    );

  departmentInvoices.forEach((inv: any) => {
    const specialty = inv.specialty || 'General';
    if (departmentStats[specialty]) {
      departmentStats[specialty].revenue += parseFloat(inv.total || '0');
    }
  });

  return Object.entries(departmentStats).map(([department, stats]) => ({
    department,
    ...stats,
    completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
    cancellationRate: stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0,
  }));
};
