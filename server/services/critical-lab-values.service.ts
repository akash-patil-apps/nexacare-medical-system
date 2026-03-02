/**
 * Critical lab value alerts: rule-based detection and notifications.
 * When a lab report is updated with results, we parse numeric values and compare
 * to critical thresholds; if any are critical, we notify the ordering doctor and optionally nurse.
 */

import type { LabReport } from "../../shared/schema.js";
import { getPatientById } from "./patients.service.js";
import { getDoctorById } from "./doctors.service.js";
import { NotificationService } from "./notification.service.js";

/** One parsed result: parameter name and numeric value (if available). */
export interface ParsedLabValue {
  parameterName: string;
  value: number;
  unit?: string;
  rawLine: string;
}

/** A critical value finding. */
export interface CriticalFinding {
  parameterName: string;
  value: number;
  unit?: string;
  threshold: string; // e.g. "> 6.5" or "< 40"
  severity: "critical";
}

/**
 * Parse lab report results text into parameter + numeric value pairs.
 * Format: "ParameterName: value unit (ref: range)" per line, or "ParameterName: value".
 */
export function parseLabResults(resultsText: string | null): ParsedLabValue[] {
  if (!resultsText || typeof resultsText !== "string") return [];
  const lines = resultsText.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParsedLabValue[] = [];
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*([^\s(]+)(?:\s*([^\s(]+))?(?:\s*\([^)]*\))?\s*$/);
    if (!match) continue;
    const param = match[1].trim();
    const valueStr = match[2].trim();
    const unit = match[3]?.trim();
    const num = parseFloat(valueStr.replace(/,/g, ""));
    if (!Number.isNaN(num)) {
      out.push({ parameterName: param, value: num, unit, rawLine: line });
    }
  }
  return out;
}

/**
 * Critical value thresholds (parameter name match is case-insensitive, substring).
 * Add more as needed; units can vary (mg/dL, mmol/L, etc. – we match by parameter name).
 */
const CRITICAL_RULES: Array<{
  namePattern: RegExp | string; // substring (case-insensitive) or regex
  highCritical?: number;
  lowCritical?: number;
  unitHint?: string; // optional, for display
}> = [
  { namePattern: "potassium", lowCritical: 2.5, highCritical: 6.5, unitHint: "mEq/L" },
  { namePattern: "sodium", lowCritical: 120, highCritical: 160, unitHint: "mEq/L" },
  { namePattern: "glucose", lowCritical: 40, highCritical: 500, unitHint: "mg/dL" },
  { namePattern: "blood glucose", lowCritical: 40, highCritical: 500, unitHint: "mg/dL" },
  { namePattern: "creatinine", highCritical: 10, unitHint: "mg/dL" },
  { namePattern: "troponin", highCritical: 0.04, unitHint: "ng/mL" },
  { namePattern: "platelet", lowCritical: 20000, unitHint: "per µL" },
  { namePattern: "hemoglobin", lowCritical: 7, unitHint: "g/dL" },
  { namePattern: "wbc", lowCritical: 2, highCritical: 30, unitHint: "x10^9/L" },
  { namePattern: "white blood cell", lowCritical: 2, highCritical: 30, unitHint: "x10^9/L" },
  { namePattern: "inr", highCritical: 5, unitHint: "" },
  { namePattern: "ph", lowCritical: 7.2, highCritical: 7.6, unitHint: "" },
  { namePattern: "bicarbonate", lowCritical: 10, highCritical: 40, unitHint: "mEq/L" },
  { namePattern: "calcium", lowCritical: 6, highCritical: 14, unitHint: "mg/dL" },
  { namePattern: "magnesium", lowCritical: 1.0, highCritical: 4.0, unitHint: "mEq/L" },
];

function matchesRule(paramName: string, rule: (typeof CRITICAL_RULES)[0]): boolean {
  const p = paramName.toLowerCase();
  if (typeof rule.namePattern === "string") {
    return p.includes(rule.namePattern.toLowerCase());
  }
  return (rule.namePattern as RegExp).test(paramName);
}

/**
 * Check parsed lab values against critical rules. Returns list of critical findings.
 */
export function checkCriticalValues(parsed: ParsedLabValue[]): CriticalFinding[] {
  const findings: CriticalFinding[] = [];
  for (const p of parsed) {
    for (const rule of CRITICAL_RULES) {
      if (!matchesRule(p.parameterName, rule)) continue;
      if (rule.highCritical != null && p.value > rule.highCritical) {
        findings.push({
          parameterName: p.parameterName,
          value: p.value,
          unit: p.unit,
          threshold: `> ${rule.highCritical}`,
          severity: "critical",
        });
      }
      if (rule.lowCritical != null && p.value < rule.lowCritical) {
        findings.push({
          parameterName: p.parameterName,
          value: p.value,
          unit: p.unit,
          threshold: `< ${rule.lowCritical}`,
          severity: "critical",
        });
      }
    }
  }
  return findings;
}

/**
 * Run critical value check on a lab report and send notifications to ordering doctor
 * and patient's user (in-app). Does not throw; logs errors.
 */
export async function runCriticalValueCheckAndNotify(report: LabReport): Promise<void> {
  const parsed = parseLabResults(report.results);
  if (parsed.length === 0) return;
  const findings = checkCriticalValues(parsed);
  if (findings.length === 0) return;

  const testName = report.testName || "Lab report";
  const messageDetail = findings
    .map((f) => `${f.parameterName}: ${f.value} (critical ${f.threshold})`)
    .join("; ");

  try {
    const patient = await getPatientById(report.patientId);
    if (patient?.userId) {
      await NotificationService.createNotification({
        userId: patient.userId,
        type: "lab_critical",
        title: "Critical Lab Value",
        message: `Your recent lab "${testName}" has a result that needs prompt attention: ${messageDetail}. Please contact your doctor.`,
        relatedId: report.id,
        relatedType: "lab_report",
      });
    }
  } catch (e) {
    console.error("Critical lab alert: failed to notify patient:", e);
  }

  try {
    if (report.doctorId) {
      const doctor = await getDoctorById(report.doctorId);
      if (doctor?.userId) {
        await NotificationService.createNotification({
          userId: doctor.userId,
          type: "lab_critical",
          title: "Critical Lab Value – Requires Attention",
          message: `Lab report "${testName}" (Report ID ${report.id}) has critical value(s): ${messageDetail}.`,
          relatedId: report.id,
          relatedType: "lab_report",
        });
      }
    }
  } catch (e) {
    console.error("Critical lab alert: failed to notify doctor:", e);
  }
}
