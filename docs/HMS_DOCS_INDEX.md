# NexaCare — “Start → Finish” Documentation Index (Single Source of Truth)

This file is the **top-level index** for the “HMS documentation job”. It defines:
- What we documented
- Where it lives
- What “done” means
- What’s intentionally out-of-scope until you request PRDs/specs

---

## 1) Start Point (Read Order)

### If you want “Where are we today?”
1. `docs/PROJECT_STATUS_SNAPSHOT.md` (current implemented modules & gaps)
2. `docs/QA_GAP_REPORT.md` (tester view: flow gaps + button audit)

### If you want “What should a complete HMS offer?”
1. `docs/HMS_MASTER_REPORT.md` (OPD→IPD→Discharge workflows + departments + scenarios)
2. `docs/FEATURE_GAP_MATRIX.md` (module-by-module: full HMS vs NexaCare + phased roadmap)

---

## 2) Key Deliverables (Completed)
- **IPD definition + full HMS workflow blueprint**: `docs/HMS_MASTER_REPORT.md`
- **Current project factual snapshot**: `docs/PROJECT_STATUS_SNAPSHOT.md`
- **Feature gap matrix + roadmap phases**: `docs/FEATURE_GAP_MATRIX.md`
- **QA report (flows vs reality + buttons mapped to tasks)**: `docs/QA_GAP_REPORT.md`

---

## 2.1 PRDs (Implementation Specs)
- **OPD Queue / Token Management**: `docs/PRD_OPD_QUEUE_TOKEN.md`
- **Appointment Rescheduling**: `docs/PRD_APPOINTMENT_RESCHEDULING.md`
- **OPD Billing & Payments (v1)**: `docs/PRD_OPD_BILLING_PAYMENTS_V1.md`
- **Doctor Availability & Leave**: `docs/PRD_DOCTOR_AVAILABILITY_LEAVE.md`
- **Messaging + Notifications (v1)**: `docs/PRD_MESSAGING_NOTIFICATIONS.md`
- **Lab Orders Lifecycle (v1)**: `docs/PRD_LAB_ORDERS_LIFECYCLE.md`
- **IPD ADT + Bed Management (v1)**: `docs/PRD_IPD_ADT_BED_MANAGEMENT_V1.md`
- **Nursing Station + eMAR (v1)**: `docs/PRD_NURSING_STATION_EMAR_V1.md`
- **Pharmacy Inventory + Dispensing (v1)**: `docs/PRD_PHARMACY_INVENTORY_DISPENSING_V1.md`
- **Radiology RIS + Reporting (v1)**: `docs/PRD_RADIOLOGY_RIS_PACS_OUTLINE.md`
- **Audit Logs + RBAC (v1)**: `docs/PRD_AUDIT_LOGS_RBAC_COMPLIANCE.md`
- **Reporting & Analytics (v1)**: `docs/PRD_REPORTING_ANALYTICS.md`

---

## 3) Finish Line (When the documentation job is “done”)

This documentation job is considered **complete** when:
- The 4 docs above exist and are linked from the docs index (this file)
- Each dashboard’s major buttons are categorized as **OK / Placeholder / Missing** (done in QA report)
- The gap matrix identifies **P0/P1/P2** and a recommended build sequence (done)

After this point, any new documentation work becomes a **module PRD** request (e.g., “Billing PRD”, “IPD/ADT PRD”, “Queue/Token PRD”).

---

## 4) Out of Scope (until you ask)
These require deeper decisions (country rules, billing model, TPA, etc.) and should be written as PRDs:
- Billing (tariffs/packages/TPA/claims/GST), payment gateway integration
- IPD/ADT (admission/bed transfers/discharge clearance)
- Nursing station (eMAR/vitals/care plans)
- Pharmacy inventory + dispensing
- LIS/RIS/PACS integrations (HL7/FHIR/DICOM)


