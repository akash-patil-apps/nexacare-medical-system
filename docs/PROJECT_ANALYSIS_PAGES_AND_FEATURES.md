# NexaCare Medical System – Page-by-Page & Feature-by-Feature Analysis

**Date:** January 29, 2026  
**Purpose:** Identify which pages and features are complete vs need work, and prioritize next steps.

---

## 1. Route & Page Inventory

### 1.1 Top-Level Routes (App.tsx)

| Route | Page | Role Access | Status |
|-------|------|-------------|--------|
| `/`, `/login` | Login | All | ✅ In use |
| `/register` | Register | All | ✅ In use |
| `/register/with-role` | Register with role | All | ✅ In use |
| `/otp-verification` | OTP verification | All | ✅ In use |
| `/forgot-password` | Forgot password | All | ✅ In use |
| `/onboarding/patient` … `/onboarding/lab` | Role onboarding | Per role | ✅ In use |
| `/dashboard` | Role-based redirect | All | ✅ In use |
| `/dashboard/patient` | Patient dashboard | PATIENT | ✅ In use |
| `/dashboard/patient/appointments` | Patient appointments | PATIENT | ✅ In use |
| `/dashboard/patient/prescriptions` | Patient prescriptions | PATIENT | ✅ In use |
| `/dashboard/doctor` | Doctor dashboard | DOCTOR | ✅ In use |
| `/dashboard/doctor/appointments` | Doctor appointments | DOCTOR | ✅ In use |
| `/dashboard/hospital` | Hospital dashboard | HOSPITAL, ADMIN | ✅ In use |
| `/dashboard/hospital/revenue` | Revenue details | HOSPITAL, ADMIN | ✅ In use |
| `/dashboard/lab` | Lab dashboard | LAB | ✅ In use |
| `/dashboard/receptionist` | Receptionist dashboard | RECEPTIONIST | ✅ In use |
| `/dashboard/nurse` | Nurse dashboard | NURSE | ✅ In use |
| `/dashboard/pharmacist` | Pharmacist dashboard | PHARMACIST | ✅ In use |
| `/dashboard/radiology-technician` | Radiology dashboard | RADIOLOGY_TECHNICIAN | ✅ In use |
| `/book-appointment` | Book appointment | PATIENT | ✅ In use |
| `/appointments` | Patient appointments (alias) | PATIENT | ✅ In use |
| `/payment/checkout` | Payment checkout | PATIENT | ✅ In use |
| `/payment/success` | Payment success | PATIENT | ✅ In use |
| `/payment/failure` | Payment failure | PATIENT | ✅ In use |

**Note:** IPD, Lab workflow, Pharmacy, Radiology workflow, Reports, and Audit are **not** top-level routes. They are embedded as **tabs/views** inside the respective dashboards (Hospital, Lab, Pharmacist, Radiology, etc.).

---

## 2. Feature Status by Role

### 2.1 Patient

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Login / Register | `/login`, `/register` | ✅ | Working |
| Book appointment | `/book-appointment` | ✅ | Hospital → Doctor → Date → Slot → Pay |
| My appointments | Dashboard / appointments | ✅ | List, status, token |
| My prescriptions | Dashboard / prescriptions | ✅ | List, view |
| Lab results (by appointment) | Patient appointments (past) | ✅ | Linked to past appointments |
| Payment (checkout/success/failure) | `/payment/*` | ✅ | In use |
| Messages | Sidebar / dashboard | ⏳ | “Messages coming soon” |
| Lab reports (standalone) | Patient sidebar | ⏳ | “Lab reports page coming soon” |
| Refill request | Patient dashboard | ⏳ | “Refill request flow coming soon” |
| Document upload | Patient dashboard | ⏳ | “Document upload coming soon” |
| Patient history dashboard | Patient dashboard | ⏳ | “Patient history dashboard coming soon” |
| Prescription detail view | Prescription card | ⏳ | “Prescription detail view coming soon” |

### 2.2 Receptionist

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Dashboard, queue, appointments | Receptionist dashboard | ✅ | Working |
| Confirm / Check-in / Complete | Receptionist dashboard | ✅ | Token flow (temp → real) |
| Record vitals | After check-in | ✅ | VitalsEntryForm |
| Request lab test | After check-in | ✅ | Lab request with hospital name |
| Create invoice | After check-in | ✅ | InvoiceModal |
| Walk-in / OTP | Registration flow | ✅ | In use |
| IPD (admission, encounters list) | Tab in receptionist dashboard | ✅ | AdmissionModal, IpdEncountersList |
| Appointments (sidebar) | Sidebar | ⏳ | “Appointments page coming soon” (redundant with dashboard?) |
| Contact directory | Sidebar | ⏳ | “Contact directory coming soon” |
| Profile | Sidebar / header | ⏳ | “Profile coming soon” |
| No-show / Pending payments | KPIs | ⏳ | TODO in code (calculated as 0) |

### 2.3 Doctor

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Dashboard, today/upcoming appointments | Doctor dashboard | ✅ | Working |
| Create prescription | From appointment | ✅ | Prescription flow |
| View patient / vitals / lab | Appointment row / drawer | ✅ | In use |
| IPD (encounters, admit, bed, rounds) | Doctor dashboard tabs | ✅ | IpdEncountersList, AdmissionModal, BedManagement, IPDPatientDetail |
| Doctor appointments page | `/dashboard/doctor/appointments` | ✅ | In use |
| Doctor prescriptions page | Doctor prescriptions page | ✅ | In use |
| Patients list | Sidebar | ⏳ | “Patients page coming soon” |
| Lab reports | Sidebar | ⏳ | “Lab Reports page coming soon” |
| IPD patients (sidebar) | Sidebar | ⏳ | “IPD Patients page coming soon” (IPD already in dashboard) |
| Availability | Sidebar | ⏳ | “Availability page coming soon” |
| Lab queue | Dashboard | ⏳ | “Lab queue coming soon” |
| Profile | Header | ⏳ | “Profile coming soon” |

### 2.4 Hospital Admin

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Dashboard (KPIs, stats) | Hospital dashboard | ✅ | Working |
| Main tabs: Appointments, IPD, Reports, Audit | Same page, tabs | ✅ | All four tabs render |
| Appointments (today/upcoming) | Appointments tab | ✅ | Table, filters |
| IPD: Bed structure, occupancy, encounters | IPD tab | ✅ | BedStructureManager, BedOccupancyMap, IpdEncountersList |
| Reports & Analytics | Reports tab | ✅ | ReportsPage (OPD, Lab, Finance, IPD census) |
| Audit logs | Audit tab | ✅ | AuditLogsPage |
| Revenue | `/dashboard/hospital/revenue` | ✅ | RevenueDetails page |
| Sidebar: Dashboard, Revenue | Narrow sidebar | ✅ | Dashboard = main content; Revenue = link |
| Sidebar: Doctors, Patients, Appointments, Lab Reports | Narrow sidebar | ⏳ | “Coming soon” (separate pages not built) |
| Profile | Sidebar | ⏳ | “Profile coming soon” |
| View all appointments | Card extra | ⏳ | “View all appointments feature coming soon” |
| Revenue export (CSV/PDF) | Revenue page | ⏳ | TODO in code; “Export feature coming soon” |

### 2.5 Lab Technician

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Dashboard | Lab dashboard | ✅ | Working |
| Pending orders | Tab | ✅ | pending-orders.tsx |
| Sample collection | Tab | ✅ | sample-collection.tsx |
| Result entry | Tab | ✅ | result-entry.tsx |
| Report release | Tab | ✅ | report-release.tsx (API: lab-workflow) |
| View all reports | Link | ⏳ | “View all reports feature coming soon” |
| Profile | Sidebar | ⏳ | “Profile coming soon” |

### 2.6 Pharmacist

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Dashboard, prescriptions list | Pharmacist dashboard | ✅ | Working |
| Inventory | Tab | ✅ | pharmacy/inventory.tsx |
| Dispensing | Tab | ✅ | pharmacy/dispensing.tsx |
| Purchase orders | Tab | ✅ | pharmacy/purchase-orders.tsx |
| Suppliers | Tab | ✅ | pharmacy/suppliers.tsx |
| Stock movements | Tab | ✅ | pharmacy/stock-movements.tsx |
| Low stock alerts | Dashboard | ⏳ | TODO: fetch from inventory API (currently 0) |
| Patient counseling | Quick action | ⏳ | “Patient counseling feature coming soon” |
| Stock alerts | Quick action | ⏳ | “Stock alerts feature coming soon” |
| Dispense (some button) | Dashboard | ⏳ | “Dispense feature coming soon” (may overlap with Dispensing tab) |
| Profile | Sidebar | ⏳ | “Profile coming soon” |

### 2.7 Radiology Technician

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Dashboard | Radiology technician dashboard | ✅ | Working |
| Pending orders | Tab | ✅ | radiology/pending-orders.tsx |
| Report creation | Tab | ✅ | radiology/report-creation.tsx |
| Report release | Tab | ✅ | radiology/report-release.tsx (uses orders?status=completed; may need dedicated reports endpoint) |
| Start imaging / Perform imaging | Buttons | ⏳ | “Start imaging feature coming soon” / “Perform imaging feature coming soon” |
| Imaging procedure, Image upload, Equipment, Scheduling | Quick actions | ⏳ | All “coming soon” |
| Profile | Sidebar | ⏳ | “Profile coming soon” |

### 2.8 Nurse

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Dashboard, IPD encounters (assigned) | Nurse dashboard | ✅ | Working |
| IPD list, assign nurse | Tabs / modals | ✅ | In use |
| Nursing notes | Quick action | ⏳ | “Nursing notes feature coming soon” |
| Medication administration | Quick action | ⏳ | “Medication administration feature coming soon” (eMAR exists as page but may not be linked from dashboard) |
| Shift handover | Quick action | ⏳ | “Shift handover feature coming soon” |
| Medication list / administration components | In code | ⏳ | TODO comments in nurse-dashboard |
| Profile | Sidebar | ⏳ | “Profile coming soon” |

---

## 3. End-to-End Flows (from TESTING_GUIDE_COMPLETE_FLOW.md)

| Flow | Steps | Status | Gaps |
|------|--------|--------|------|
| **Appointment flow** | Patient book → Pay → Receptionist confirm (temp token) → Check-in (real token) → Vitals / Lab request → Doctor prescription → Invoice | ✅ Documented & implemented | Verify prescription save; invoice data (patient, doctor, payment, timestamp) |
| **Lab flow** | Receptionist requests lab → Lab tech: sample → result → release → Patient sees in appointments | ✅ Implemented | Ensure lab results and notifications reach patient |
| **Medicine reminders** | Prescription created → Reminders per schedule | ⏳ | IMPLEMENTATION_SUMMARY: “Add medicine reminder notifications” |
| **Radiology flow** | Order → Imaging → Report creation → Report release | ✅ UI present | Radiology report release uses orders as proxy; may need `/api/radiology-workflow/reports` and proper release |

---

## 4. Backend vs Frontend Alignment

- **Lab workflow:** Client uses `/api/lab-workflow/orders`, `/api/lab-workflow/reports/release` – routes exist.
- **Radiology workflow:** Client uses `/api/radiology-workflow/orders`, `/api/radiology-workflow/reports/{id}/release`. Report release page fetches orders with `status=completed`; comment in code says “This would need a new endpoint to fetch reports” – backend may need a dedicated reports list/release API.
- **Pharmacy:** Dispensing, inventory, purchase orders, suppliers, movements – used from pharmacist dashboard; backend routes exist.
- **IPD:** Encounters, beds, structure, transfer, discharge, assign nurse – used from hospital/receptionist/doctor/nurse; backend has ipd, ipd-workflow routes.
- **Reports:** OPD, Lab, Finance, IPD census – ReportsPage calls `/api/reports/*` – confirm all report types are implemented and export works.
- **Audit:** AuditLogsPage uses `/api/audit` and export – confirm export and filters work.

---

## 5. What to Work on Next (Prioritized)

### P0 – Critical for core flows

1. **Medicine reminders**  
   - Not implemented (per IMPLEMENTATION_SUMMARY).  
   - Add: schedule + notifications (and optionally backend job) for prescription-based reminders.

2. **Prescription & invoice verification**  
   - Follow TESTING_GUIDE: confirm prescription creation from doctor dashboard saves correctly and invoice shows correct patient, doctor, payment, timestamp.

3. **Lab results to patient**  
   - Ensure when lab releases report: (a) result is visible on patient side (e.g. under past appointments / lab results), (b) notification is sent.

### P1 – High value, “coming soon” or TODOs

4. **Hospital: real pages for sidebar**  
   - Replace “coming soon” with real pages (or deep links) for: Doctors, Patients, Appointments, Lab Reports (or reuse existing tabs/data).

5. **Hospital: “View all appointments”**  
   - Implement the “View All” for appointments (e.g. dedicated list/filter page or link to existing appointments view).

6. **Revenue export**  
   - Implement CSV/PDF export on revenue page (TODO in code).

7. **Receptionist: no-show & pending payments**  
   - Replace TODO with real metrics (e.g. from appointments/billing).

8. **Pharmacist: low stock alerts**  
   - Connect dashboard low-stock KPI to inventory API instead of hardcoded 0.

9. **Radiology: reports API and release**  
   - Add/use proper “reports” resource (e.g. `/api/radiology-workflow/reports`) and wire report release to it so it’s not only order-based.

### P2 – UX and completeness

10. **Profile & settings**  
    - One place for “Profile” and “Settings” (or per-role) so all “Profile coming soon” / “Settings coming soon” point to real screens.

11. **Patient: messages**  
    - Implement or remove “Messages” (and “Messages coming soon”) for a consistent UX.

12. **Patient: lab reports (standalone)**  
    - Dedicated “Lab reports” page for patient (or clearly link from appointments/prescriptions) and remove “Lab reports page coming soon” from sidebar.

13. **Doctor: availability**  
    - Implement availability management page and link from sidebar (AvailabilityManager exists; ensure route and sidebar link).

14. **Nurse: eMAR / medication administration**  
    - Link nurse dashboard “Medication administration” to eMAR page (emar.tsx) and ensure flow is clear.

15. **Bulk reschedule**  
    - “Manual selection (coming soon)” in BulkRescheduleModal – implement or hide.

### P3 – Nice to have

16. **Other “coming soon”**  
    - Patient: Refill request, Document upload, Patient history dashboard, Prescription detail view.  
    - Receptionist: Contact directory.  
    - Doctor: Lab queue, separate Patients/Lab Reports/IPD sidebar pages (if not redundant).  
    - Pharmacist: Patient counseling, Stock alerts, redundant “Dispense” CTA.  
    - Radiology: Start imaging, Perform imaging, Imaging procedure, Image upload, Equipment, Scheduling.  
    - Nurse: Nursing notes, Shift handover.

---

## 6. Quick Test Checklist (manual)

When running `pnpm dev` (or `npm run dev`):

1. **Login** as Patient → Book appointment (hospital, doctor, date, slot, pay).
2. **Login** as Receptionist → Confirm appointment (temp token) → Check-in (real token) → Record vitals → Request lab test → Create invoice.
3. **Login** as Doctor → See appointment → Create prescription.
4. **Login** as Lab** → Find order → Sample collect → Result entry → Report release.
5. **Login** as Patient** → Check past appointment for prescription, lab result, invoice.
6. **Hospital** → Open Appointments, IPD, Reports, Audit tabs → Revenue page → Check export (when implemented).
7. **Pharmacist** → Open Inventory, Dispensing, Purchase orders, Suppliers, Stock movements.
8. **Radiology** → Pending orders → Report creation → Report release (after backend is aligned).
9. **Nurse** → IPD list → Assign nurse; then eMAR (when linked).

---

## 7. Summary Table

| Area | Working | Needs work |
|------|--------|------------|
| **Auth & onboarding** | Login, register, OTP, forgot password, all role onboardings | – |
| **Patient** | Book appointment, appointments, prescriptions, payment, lab in past appointments | Messages, standalone lab reports, refill, upload, history, prescription detail |
| **Receptionist** | Queue, confirm/check-in, vitals, lab request, invoice, IPD | Sidebar “Appointments”/“Contact”, Profile, no-show/pending KPIs |
| **Doctor** | Dashboard, appointments, prescriptions, IPD (admit, rounds, etc.) | Sidebar links (Patients, Lab, IPD, Availability), Lab queue, Profile |
| **Hospital** | Dashboard, Appointments/IPD/Reports/Audit tabs, Revenue page | Sidebar (Doctors, Patients, Appointments, Lab Reports), View all appointments, Export revenue, Profile |
| **Lab** | Pending orders, sample, result entry, report release | View all reports, Profile |
| **Pharmacist** | Inventory, dispensing, PO, suppliers, stock movements | Low stock API, counseling, stock alerts, one “Dispense” CTA, Profile |
| **Radiology** | Pending orders, report creation, report release (UI) | Reports API/release semantics, imaging/equipment/scheduling, Profile |
| **Nurse** | IPD list, assign nurse | eMAR link, nursing notes, shift handover, medication components, Profile |
| **Cross-cutting** | Appointment + token + invoice + lab flow | Medicine reminders, profile/settings, many “coming soon” items |

Use this document to track progress and pick the next P0/P1 items for implementation and testing.
