# NexaCare — QA Gap Report (Flows vs Real-Life) + Button/Action Audit

> **Perspective**: “Tester view” of the current product based on static analysis of the frontend pages and API routes in this repo.  
> **Scope**: OPD flow + role dashboards (Patient/Receptionist/Doctor/Hospital/Lab).  
> **Goal**: identify **missing real-life workflow steps** and verify **each button/action** is mapped to a real task (API call, navigation, modal, etc.).

---

## 1) What Works End-to-End Today (Core OPD Loop)

### 1.1 Patient → Book appointment (Online)
- Patient can book an appointment from `client/src/pages/book-appointment.tsx` (multi-step flow).
- Backend validates required fields in `server/routes/appointments.routes.ts` (`POST /api/appointments`).

### 1.2 Receptionist → Confirm/Reject/Check-in
- Receptionist sees hospital appointments via `GET /api/appointments/my`.
- Can:
  - **Confirm**: `PATCH /api/appointments/:appointmentId/confirm`
  - **Reject with reason**: `PATCH /api/appointments/:appointmentId/cancel` (reason stored in appointment notes)
  - **Check-in**: `PATCH /api/appointments/:appointmentId/check-in` (sets status to checked-in; note appended)

### 1.3 Doctor → Add prescription → Mark “Checked” (Completed)
- Doctor sees active appointments (confirmed/checked-in) in doctor dashboard.
- Doctor can add/view prescription and can mark appointment **completed** via `PATCH /api/appointments/:id/status` (status → completed).

### 1.4 Patient → View appointments + cancel (limited)
- Patient can view appointments and can cancel **only pending** appointments (Popconfirm + cancel endpoint).
- Patient sees cancellation reason extracted from appointment notes.

---

## 2) Real-Life OPD Workflow Gaps (What’s Missing / Partial)

### 2.1 Scheduling & front-desk operations (high impact)
- **Token/Queue management**: real clinics run a token/queue by specialty/doctor; currently missing.
- **Reschedule flow**: common requirement (doctor delay/leave, patient reschedule); currently missing.
- **No-show handling**: no-show tagging, auto close, follow-up messages; currently TODO/partial.
- **Doctor leave / override schedule**: bulk reschedule + patient notifications; missing.
- **Walk-in queue**: “walk-ins waiting” exists as a KPI, but queue mechanics are not fully implemented.

### 2.2 Billing & payments (high impact)
- **OPD billing**: invoice/receipt, payment collection, refunds, discounts approvals; missing.
- **Payment status tracking**: UI shows “Payment” tag, but KPI “Pending payments” is TODO; no full payment module.

### 2.3 Clinical documentation (high impact)
- **EMR notes**: symptoms, vitals, diagnosis coding, visit notes; mostly missing.
- **CPOE orders**: labs/radiology/pharmacy/nursing orders lifecycle; missing/partial.
- **Doctor workflow**: “In consultation” state management + start/end timestamps are not implemented as a clear workflow.

### 2.4 Diagnostics (Lab/Radiology)
- **Lab order lifecycle** (sample collected → processing → validated → released): missing.
- **Doctor lab queue / lab results review**: UI hints exist; API/UI are not complete.
- **Radiology/RIS/PACS**: missing (expected in full HMS).

### 2.5 Patient portal completeness
- **Messaging**: patient↔hospital/doctor messaging is “coming soon”.
- **Document uploads**: “coming soon”.
- **Refill requests**: “coming soon”.
- **Patient demographic completeness**: booking flow uses default city (not real-life; should come from patient profile).

### 2.6 Hospital admin operations
- Staff invitations, shift assignment, approvals, reporting: currently “coming soon”.
- Hospital stats endpoint is logged as “not ready yet” (partial).

### 2.7 IPD (Inpatient) modules (out of scope for OPD but critical for HMS)
- ADT (Admission/Discharge/Transfer), bed management, nursing station, IP billing, discharge workflows: missing.

---

## 3) Button/Action Audit — Are Buttons Doing the “Designated Task”?

Legend:
- **OK** = mapped to a real task (API call / navigation / modal / system action)
- **Placeholder** = wired to `message.info('coming soon')` or similar (not a real workflow)
- **Partial** = does something, but not the real workflow end state

### 3.1 Receptionist Dashboard (`client/src/pages/dashboards/receptionist-dashboard.tsx`)

**Appointment row actions**
- **Confirm (green check icon)**: **OK** → `PATCH /api/appointments/:id/confirm`
- **Reject (red cross icon)**: **OK** → opens rejection modal → submits `PATCH /api/appointments/:id/cancel` with `cancellationReason`
- **Check-in**: **OK** → `PATCH /api/appointments/:id/check-in`
- **Call (phone icon)**: **OK** → `tel:` link
- **Message (message icon)**: **OK** → `sms:` link
- **Patient name link**: **OK** → fetches patient info via `/api/reception/patients/:id/info`

**Dashboard/summary actions**
- **KPI “View …” (Pending/Confirmed/Walk-ins/Completed)**: **Placeholder** → `message.info('View ...')` only (does not filter/navigate)
- **Upcoming appointments “View All”**: **Placeholder** → `message.info('coming soon')`

**Known TODOs (explicit)**
- `noShowAppointments`: **TODO**
- `pendingPayments`: **TODO**

### 3.2 Doctor Dashboard (`client/src/pages/dashboards/doctor-dashboard.tsx`)

**Appointment table actions**
- **Patient name link**: **OK** → patient info fetch
- **Add/View/Edit Prescription**: **OK** → opens prescription modal; persists via prescription API (implemented elsewhere)
- **Checked** (mark completed): **OK** → `PATCH /api/appointments/:id/status` (status completed)

**Other actions**
- **Call/Message**: **OK** → `tel:` / `sms:` links
- **Settings button**: **Placeholder** → `message.info('Settings coming soon.')`

**Quick actions / widgets**
- “Consultation room”, “Availability management”, “Lab queue”: **Placeholder** (`message.info('... coming soon')`)
- Lab reports query logs “API not ready yet”: **Partial** (UI exists but backend readiness unclear)
- Notification widgets: **Partial** (some plumbing exists; not consistently complete)

### 3.3 Patient Appointments (`client/src/pages/dashboards/patient-appointments.tsx`)
- **View**: **OK** → opens modal with appointment details
- **Cancel (pending only)**: **OK** → `PATCH /api/appointments/:id/cancel` (plays cancellation sound)
- **Reschedule/Edit**: **Missing** (no working UI for reschedule; real-life critical)

### 3.4 Patient Dashboard (`client/src/pages/dashboards/patient-dashboard.tsx`)
- **Book appointment**: **OK** → navigates to `/book-appointment`
- **Upcoming appointments KPI**: **OK** → navigates to appointments page
- **Active prescriptions KPI**: **OK** → navigates to prescriptions page
- **Refill / Upload docs / Messaging / History**: **Placeholder** → `message.info('coming soon')`

### 3.5 Hospital Dashboard (`client/src/pages/dashboards/hospital-dashboard.tsx`)
- **KPI “View …” actions** (doctors/patients/appointments/revenue): **Placeholder** → `message.info('View ...')`
- **Quick actions** (Invite staff / Assign shift / Approve requests / Reports): **Placeholder**
- **Upcoming appointments “View All”**: **Placeholder**
- Hospital stats query logs “API not ready yet”: **Partial**

### 3.6 Lab Dashboard (`client/src/pages/dashboards/lab-dashboard.tsx`)
- **Log Sample / Upload Report**: **OK** → opens upload modal
- **Assign technician / Request re-test**: **Placeholder**
- **Reports “View All”**: **Placeholder**
- Lab profile/reports/notifications log “API not ready yet”: **Partial**

### 3.7 Registration (`client/src/pages/auth/register.tsx`)
- Some roles: **Placeholder** onboarding (“coming soon”) depending on chosen role.

---

## 4) Most Important Missing Features (Prioritized)

### P0 (blocks real hospital ops)
- Queue/token management for OPD
- Reschedule flow (doctor & patient), bulk reschedule + notifications
- OPD billing + payments + receipts + refunds
- Clinical notes / visit documentation basics (even minimal SOAP)

### P1 (makes system “real-life usable”)
- Doctor availability/leave management (UI + rules)
- Lab orders lifecycle (not just report upload) + doctor review loop
- Patient profile completeness (DOB/gender/address), intake forms
- Messaging + reminders (SMS/WhatsApp)

### P2 (enterprise / later)
- IPD/ADT, bed management, nursing station, IP billing, OT workflows
- Audit logs, compliance-grade reporting, integrations (HL7/FHIR/DICOM)

---

## 5) Recommendation: What to Build Next (Best Sequence)
1. **Reception queue + reschedule** (smallest effort, biggest operational impact)
2. **OPD billing + payment tracking** (enables revenue cycle)
3. **Doctor clinical notes + follow-up planning**
4. **Lab order lifecycle (LIS-lite)** (doctor orders → lab fulfills → results)




