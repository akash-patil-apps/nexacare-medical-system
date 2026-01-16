// server/services/ipd-discharge-summary.service.ts
import { db } from "../db";
import {
  ipdEncounters,
  medicationOrders,
  labOrders,
  radiologyOrders,
  clinicalNotes,
  invoices,
  invoiceItems,
  payments,
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import * as ipdOrdersService from "./ipd-orders.service";
import * as ipdRoundsService from "./ipd-rounds.service";
import * as chargesService from "./hospital-charges.service";

/**
 * Generate comprehensive discharge summary for IPD patient
 * Includes: diagnosis, treatment, medications, lab/radiology tests, bills, and follow-up
 */
export const generateDischargeSummary = async (encounterId: number) => {
  try {
    // Get encounter details
    const [encounter] = await db
      .select()
      .from(ipdEncounters)
      .where(eq(ipdEncounters.id, encounterId))
      .limit(1);

    if (!encounter) {
      throw new Error("Encounter not found");
    }

    // Calculate length of stay
    const admittedDate = new Date(encounter.admittedAt);
    const dischargeDate = encounter.dischargedAt ? new Date(encounter.dischargedAt) : new Date();
    const daysDiff = Math.floor((dischargeDate.getTime() - admittedDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get all orders (medications, lab, radiology)
    const orders = await ipdOrdersService.getEncounterOrders(encounterId);

    // Get all rounds/clinical notes
    const rounds = await ipdRoundsService.getEncounterRounds(encounterId);

    // Get invoices and payments for this encounter
    const encounterInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.encounterId, encounterId))
      .orderBy(desc(invoices.createdAt));

    let totalBilled = 0;
    let totalPaid = 0;
    const invoiceDetails: any[] = [];

    for (const invoice of encounterInvoices) {
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id));

      const invoicePayments = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoice.id));

      const invoiceTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const invoicePaid = invoicePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

      totalBilled += invoiceTotal;
      totalPaid += invoicePaid;

      invoiceDetails.push({
        invoiceNumber: invoice.invoiceNumber,
        date: invoice.createdAt,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        total: invoiceTotal,
        paid: invoicePaid,
        balance: invoiceTotal - invoicePaid,
      });
    }

    // Format medications list
    const activeMedications = orders.medications
      .filter((m) => m.status === "active")
      .map((m) => `${m.medicationName} ${m.dosage} ${m.unit} - ${m.frequency}${m.route ? ` (${m.route})` : ""}`)
      .join("\n");

    const completedMedications = orders.medications
      .filter((m) => m.status === "completed")
      .map((m) => `${m.medicationName} ${m.dosage} ${m.unit} - ${m.frequency}`)
      .join("\n");

    // Format lab tests
    const labTests = orders.lab
      .map((l) => l.orderNumber || `Lab Order #${l.id}`)
      .join(", ");

    // Format radiology tests
    const radiologyTests = orders.radiology
      .map((r) => r.orderNumber || `Radiology Order #${r.id}`)
      .join(", ");

    // Get latest round/clinical note for diagnosis and assessment
    const latestRound = rounds.length > 0 ? rounds[0] : null;

    // Build comprehensive discharge summary
    const summarySections = [];

    // Header
    summarySections.push("=".repeat(60));
    summarySections.push("DISCHARGE SUMMARY");
    summarySections.push("=".repeat(60));
    summarySections.push("");

    // Patient and Admission Info
    summarySections.push("PATIENT INFORMATION:");
    summarySections.push(`Admission Date: ${new Date(encounter.admittedAt).toLocaleDateString()}`);
    summarySections.push(`Discharge Date: ${dischargeDate.toLocaleDateString()}`);
    summarySections.push(`Length of Stay: ${daysDiff} day${daysDiff !== 1 ? "s" : ""}`);
    summarySections.push(`Admission Type: ${encounter.admissionType?.toUpperCase() || "N/A"}`);
    summarySections.push("");

    // Diagnosis and Clinical Course
    if (latestRound) {
      summarySections.push("CLINICAL COURSE:");
      if (latestRound.chiefComplaint) {
        summarySections.push(`Chief Complaint: ${latestRound.chiefComplaint}`);
      }
      if (latestRound.subjective) {
        summarySections.push(`Subjective: ${latestRound.subjective}`);
      }
      if (latestRound.objective) {
        summarySections.push(`Objective: ${latestRound.objective}`);
      }
      if (latestRound.assessment) {
        summarySections.push(`Assessment: ${latestRound.assessment}`);
      }
      summarySections.push("");
    }

    // Treatment Given
    summarySections.push("TREATMENT GIVEN:");
    if (rounds.length > 0) {
      summarySections.push(`Total Rounds/Visits: ${rounds.length}`);
      if (latestRound?.plan) {
        summarySections.push(`Treatment Plan: ${latestRound.plan}`);
      }
    } else {
      summarySections.push("No clinical notes recorded.");
    }
    summarySections.push("");

    // Medications
    summarySections.push("MEDICATIONS:");
    if (activeMedications) {
      summarySections.push("Active Medications at Discharge:");
      summarySections.push(activeMedications);
    }
    if (completedMedications) {
      summarySections.push("\nCompleted Medications:");
      summarySections.push(completedMedications);
    }
    if (!activeMedications && !completedMedications) {
      summarySections.push("No medications recorded.");
    }
    summarySections.push("");

    // Investigations
    summarySections.push("INVESTIGATIONS:");
    if (labTests) {
      summarySections.push(`Lab Tests: ${labTests}`);
    }
    if (radiologyTests) {
      summarySections.push(`Radiology Tests: ${radiologyTests}`);
    }
    if (!labTests && !radiologyTests) {
      summarySections.push("No investigations recorded.");
    }
    summarySections.push("");

    // Get detailed charges
    const encounterCharges = await chargesService.getEncounterCharges(encounterId);

    // Billing Summary with Itemized Charges
    summarySections.push("BILLING SUMMARY:");
    summarySections.push("=".repeat(60));
    
    // Bed Charges
    if (encounterCharges.bedCharges.length > 0) {
      summarySections.push("\nBED CHARGES:");
      let bedTotal = 0;
      encounterCharges.bedCharges.forEach((charge) => {
        summarySections.push(`  ${charge.date} - ${charge.bedName} (${charge.bedType}): ${charge.days} day(s) x ₹${charge.dailyRate} = ₹${charge.total.toFixed(2)}`);
        bedTotal += charge.total;
      });
      summarySections.push(`  Subtotal: ₹${bedTotal.toFixed(2)}`);
    }

    // Lab Charges
    if (encounterCharges.labCharges.length > 0) {
      summarySections.push("\nLAB TEST CHARGES:");
      let labTotal = 0;
      encounterCharges.labCharges.forEach((charge) => {
        summarySections.push(`  ${charge.date} - ${charge.testName}: ₹${charge.price.toFixed(2)}`);
        labTotal += charge.price;
      });
      summarySections.push(`  Subtotal: ₹${labTotal.toFixed(2)}`);
    }

    // Radiology Charges
    if (encounterCharges.radiologyCharges.length > 0) {
      summarySections.push("\nRADIOLOGY CHARGES:");
      let radTotal = 0;
      encounterCharges.radiologyCharges.forEach((charge) => {
        summarySections.push(`  ${charge.date} - ${charge.testName}: ₹${charge.price.toFixed(2)}`);
        radTotal += charge.price;
      });
      summarySections.push(`  Subtotal: ₹${radTotal.toFixed(2)}`);
    }

    // Medication Charges
    if (encounterCharges.medicationCharges.length > 0) {
      summarySections.push("\nMEDICATION CHARGES:");
      let medTotal = 0;
      encounterCharges.medicationCharges.forEach((charge) => {
        summarySections.push(`  ${charge.date} - ${charge.medicationName}: ${charge.quantity} x ₹${charge.unitPrice} = ₹${charge.total.toFixed(2)}`);
        medTotal += charge.total;
      });
      summarySections.push(`  Subtotal: ₹${medTotal.toFixed(2)}`);
    }

    // Service Charges
    if (encounterCharges.serviceCharges.length > 0) {
      summarySections.push("\nSERVICE CHARGES:");
      let serviceTotal = 0;
      encounterCharges.serviceCharges.forEach((charge) => {
        summarySections.push(`  ${charge.date} - ${charge.serviceName}: ₹${charge.price.toFixed(2)}`);
        serviceTotal += charge.price;
      });
      summarySections.push(`  Subtotal: ₹${serviceTotal.toFixed(2)}`);
    }

    // Invoice Summary (if exists)
    if (invoiceDetails.length > 0) {
      summarySections.push("\nINVOICE DETAILS:");
      invoiceDetails.forEach((inv, index) => {
        summarySections.push(`\nInvoice ${index + 1} (${inv.invoiceNumber}):`);
        inv.items.forEach((item: any) => {
          summarySections.push(`  - ${item.description}: ${item.quantity} x ₹${item.unitPrice} = ₹${item.amount}`);
        });
        summarySections.push(`  Total: ₹${inv.total}`);
        summarySections.push(`  Paid: ₹${inv.paid}`);
        summarySections.push(`  Balance: ₹${inv.balance}`);
      });
    }

    // Grand Total
    summarySections.push("\n" + "=".repeat(60));
    summarySections.push(`CALCULATED TOTAL CHARGES: ₹${encounterCharges.total.toFixed(2)}`);
    if (invoiceDetails.length > 0) {
      summarySections.push(`INVOICE TOTAL BILLED: ₹${totalBilled.toFixed(2)}`);
      summarySections.push(`TOTAL PAID: ₹${totalPaid.toFixed(2)}`);
      summarySections.push(`OUTSTANDING BALANCE: ₹${(totalBilled - totalPaid).toFixed(2)}`);
    }
    summarySections.push("=".repeat(60));
    summarySections.push("");

    // Follow-up Instructions
    if (latestRound?.plan) {
      summarySections.push("FOLLOW-UP INSTRUCTIONS:");
      summarySections.push(latestRound.plan);
      summarySections.push("");
    }

    // Footer
    summarySections.push("=".repeat(60));
    summarySections.push(`Generated on: ${new Date().toLocaleString()}`);
    summarySections.push("=".repeat(60));

    return summarySections.join("\n");
  } catch (error) {
    console.error("Error generating discharge summary:", error);
    throw error;
  }
};
