import { db } from '../db';
import { hospitalCharges, bedTypePricing, ipdEncounters, bedAllocations, labOrders, radiologyOrders, medicationOrders, invoices, invoiceItems, beds } from '../../shared/schema';
import { eq, and, isNull, desc, gte, lte, or } from 'drizzle-orm';

// Simple date diff calculation (in days)
function daysDiff(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return diffTime / (1000 * 60 * 60 * 24);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Get all charges for a hospital
 */
export const getHospitalCharges = async (hospitalId: number, filters?: {
  chargeType?: string;
  chargeCategory?: string;
  isActive?: boolean;
}) => {
  const conditions = [eq(hospitalCharges.hospitalId, hospitalId)];
  
  if (filters?.chargeType) {
    conditions.push(eq(hospitalCharges.chargeType, filters.chargeType));
  }
  
  if (filters?.chargeCategory) {
    conditions.push(eq(hospitalCharges.chargeCategory, filters.chargeCategory));
  }
  
  if (filters?.isActive !== undefined) {
    conditions.push(eq(hospitalCharges.isActive, filters.isActive));
  }

  return await db
    .select()
    .from(hospitalCharges)
    .where(and(...conditions))
    .orderBy(hospitalCharges.chargeType, hospitalCharges.itemName);
};

/**
 * Get bed type pricing for a hospital
 */
export const getBedTypePricing = async (hospitalId: number) => {
  return await db
    .select()
    .from(bedTypePricing)
    .where(and(
      eq(bedTypePricing.hospitalId, hospitalId),
      eq(bedTypePricing.isActive, true)
    ))
    .orderBy(bedTypePricing.bedType);
};

/**
 * Calculate bed charges for an IPD encounter
 */
export const calculateBedCharges = async (encounterId: number) => {
  const encounter = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, encounterId))
    .limit(1);

  if (encounter.length === 0) {
    return [];
  }

  const enc = encounter[0];
  const hospitalId = enc.hospitalId;

  // Get all bed allocations for this encounter
  const allocations = await db
    .select({
      allocation: bedAllocations,
      bed: beds,
    })
    .from(bedAllocations)
    .leftJoin(beds, eq(bedAllocations.bedId, beds.id))
    .where(eq(bedAllocations.encounterId, encounterId))
    .orderBy(bedAllocations.fromAt);

  if (allocations.length === 0) {
    return [];
  }

  // Get bed pricing for this hospital
  const pricing = await getBedTypePricing(hospitalId);
  const pricingMap = new Map(pricing.map(p => [p.bedType, p]));

  const charges: Array<{
    date: string;
    bedType: string;
    bedName: string;
    days: number;
    dailyRate: number;
    total: number;
  }> = [];

  for (const alloc of allocations) {
    const fromDate = new Date(alloc.allocation.fromAt);
    const toDate = alloc.allocation.toAt ? new Date(alloc.allocation.toAt) : new Date(enc.dischargedAt || new Date());
    
    const bedType = alloc.bed?.bedType || 'general';
    const pricingInfo = pricingMap.get(bedType);
    
    if (!pricingInfo) {
      continue;
    }

    const days = daysDiff(fromDate, toDate); // Include partial days
    const fullDays = Math.floor(days);
    const hasPartialDay = days > fullDays;

    // Calculate charges
    let total = fullDays * parseFloat(pricingInfo.dailyRate.toString());
    
    if (hasPartialDay && pricingInfo.halfDayRate) {
      total += parseFloat(pricingInfo.halfDayRate.toString());
    } else if (hasPartialDay) {
      // If no half-day rate, charge full day
      total += parseFloat(pricingInfo.dailyRate.toString());
    }

    charges.push({
      date: formatDate(fromDate),
      bedType: bedType,
      bedName: alloc.bed?.bedName || alloc.bed?.bedNumber || 'N/A',
      days: Math.ceil(days),
      dailyRate: parseFloat(pricingInfo.dailyRate.toString()),
      total: total,
    });
  }

  return charges;
};

/**
 * Get all charges for an IPD encounter (bed, lab, radiology, medications, procedures)
 */
export const getEncounterCharges = async (encounterId: number) => {
  const encounter = await db
    .select()
    .from(ipdEncounters)
    .where(eq(ipdEncounters.id, encounterId))
    .limit(1);

  if (encounter.length === 0) {
    return {
      bedCharges: [],
      labCharges: [],
      radiologyCharges: [],
      medicationCharges: [],
      procedureCharges: [],
      serviceCharges: [],
      total: 0,
    };
  }

  const enc = encounter[0];
  const hospitalId = enc.hospitalId;

  // 1. Bed charges
  const bedCharges = await calculateBedCharges(encounterId);

  // 2. Lab charges
  const labOrdersData = await db
    .select()
    .from(labOrders)
    .where(eq(labOrders.encounterId, encounterId));

  const labCharges: Array<{
    date: string;
    testName: string;
    price: number;
  }> = [];

  for (const order of labOrdersData) {
    // Get charges for lab tests
    const labChargesList = await db
      .select()
      .from(hospitalCharges)
      .where(and(
        eq(hospitalCharges.hospitalId, hospitalId),
        eq(hospitalCharges.chargeType, 'lab'),
        eq(hospitalCharges.isActive, true)
      ));

    // For now, use a default price or match by test name
    // In a real system, you'd match lab order items to charges
    const defaultLabPrice = labChargesList.length > 0 
      ? parseFloat(labChargesList[0].unitPrice.toString())
      : 500;

    labCharges.push({
      date: formatDate(order.orderDate),
      testName: `Lab Order #${order.orderNumber}`,
      price: defaultLabPrice,
    });
  }

  // 3. Radiology charges
  const radiologyOrdersData = await db
    .select()
    .from(radiologyOrders)
    .where(eq(radiologyOrders.encounterId, encounterId));

  const radiologyCharges: Array<{
    date: string;
    testName: string;
    price: number;
  }> = [];

  for (const order of radiologyOrdersData) {
    const radChargesList = await db
      .select()
      .from(hospitalCharges)
      .where(and(
        eq(hospitalCharges.hospitalId, hospitalId),
        eq(hospitalCharges.chargeType, 'radiology'),
        eq(hospitalCharges.isActive, true)
      ));

    const defaultRadPrice = radChargesList.length > 0
      ? parseFloat(radChargesList[0].unitPrice.toString())
      : 2000;

    radiologyCharges.push({
      date: formatDate(order.orderDate),
      testName: `Radiology Order #${order.orderNumber}`,
      price: defaultRadPrice,
    });
  }

  // 4. Medication charges (from IPD medication orders)
  const medicationOrdersData = await db
    .select()
    .from(medicationOrders)
    .where(eq(medicationOrders.encounterId, encounterId));

  const medicationCharges: Array<{
    date: string;
    medicationName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }> = [];

  // Medication charges would come from pharmacy inventory pricing
  // For now, we'll use a placeholder

  // 5. Service charges (admission, discharge, nursing, etc.)
  const serviceCharges: Array<{
    date: string;
    serviceName: string;
    price: number;
  }> = [];

  // Admission charge
  if (enc.admittedAt) {
    const admissionCharge = await db
      .select()
      .from(hospitalCharges)
      .where(and(
        eq(hospitalCharges.hospitalId, hospitalId),
        eq(hospitalCharges.chargeType, 'admission'),
        eq(hospitalCharges.isActive, true)
      ))
      .limit(1);

    if (admissionCharge.length > 0) {
      serviceCharges.push({
        date: formatDate(enc.admittedAt),
        serviceName: 'Admission Charges',
        price: parseFloat(admissionCharge[0].unitPrice.toString()),
      });
    }
  }

  // Discharge charge
  if (enc.dischargedAt) {
    const dischargeCharge = await db
      .select()
      .from(hospitalCharges)
      .where(and(
        eq(hospitalCharges.hospitalId, hospitalId),
        eq(hospitalCharges.chargeType, 'discharge'),
        eq(hospitalCharges.isActive, true)
      ))
      .limit(1);

    if (dischargeCharge.length > 0) {
      serviceCharges.push({
        date: formatDate(enc.dischargedAt),
        serviceName: 'Discharge Processing Charges',
        price: parseFloat(dischargeCharge[0].unitPrice.toString()),
      });
    }
  }

  // Calculate totals
  const bedTotal = bedCharges.reduce((sum, c) => sum + c.total, 0);
  const labTotal = labCharges.reduce((sum, c) => sum + c.price, 0);
  const radTotal = radiologyCharges.reduce((sum, c) => sum + c.price, 0);
  const medTotal = medicationCharges.reduce((sum, c) => sum + c.total, 0);
  const serviceTotal = serviceCharges.reduce((sum, c) => sum + c.price, 0);

  const total = bedTotal + labTotal + radTotal + medTotal + serviceTotal;

  return {
    bedCharges,
    labCharges,
    radiologyCharges,
    medicationCharges,
    procedureCharges: [], // TODO: Add procedure charges
    serviceCharges,
    total,
  };
};
