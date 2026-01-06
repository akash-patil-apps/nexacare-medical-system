# PRD — Lab Orders Lifecycle (LIS‑Lite) (v1)

**Primary Roles**: Doctor, Lab Technician, Patient  
**Secondary Roles**: Receptionist, Hospital Admin  
**Goal**: move from “upload report” to a real lab workflow: order → sample → processing → result → release.

---

## 1) Problem
Current system has lab dashboards and report endpoints, but lacks a structured lab order lifecycle, assignment, and statuses. Doctors need to order tests; lab needs a queue; patients need timely results.

---

## 2) Goals (v1)
- Doctor can create a **lab order** linked to an appointment/patient.
- Lab has a **worklist/queue** and can move orders through statuses.
- Lab can upload result/report and release it.
- Patient can view released reports.

Non-goals v1: device integrations (HL7), QC analytics, complex panels.

---

## 3) Lifecycle States (v1)
`ordered` → `sample_collected` → `received` → `processing` → `result_ready` → `released`

Optional states:
- `cancelled`
- `retest_required`

---

## 4) Data Model (Proposed)
### `lab_orders`
- `id`, `hospitalId`, `patientId`, `appointmentId` (optional), `orderedByDoctorId`
- `testCode` / `testName`
- `priority`: normal/urgent
- `status` (enum above)
- `clinicalNotes` (why test ordered)
- timestamps: `orderedAt`, `sampleCollectedAt`, `receivedAt`, `releasedAt`, `createdAt`, `updatedAt`

### `lab_reports`
- `id`, `labOrderId`
- `reportUrl`/`filePath` (existing file upload service)
- `resultSummary` (text)
- `signedOffByUserId` (lab)
- `signedOffAt`

### `lab_assignments` (optional v1)
- `labOrderId`, `assignedToUserId`, `assignedAt`

---

## 5) APIs (Proposed)
### Doctor
- `POST /api/labs/orders`
  - body: `{ patientId, appointmentId?, testName, priority?, clinicalNotes? }`
- `GET /api/labs/orders/doctor` (doctor’s ordered tests)

### Lab
- `GET /api/labs/orders/my-hospital?status=ordered|processing...`
- `PATCH /api/labs/orders/:id/status` body `{ status }`
- `POST /api/labs/orders/:id/assign` body `{ technicianUserId }` (optional)
- `POST /api/labs/orders/:id/report` (upload + create report record)
- `PATCH /api/labs/orders/:id/release`

### Patient
- `GET /api/labs/my/reports` (released only)

---

## 6) UI Requirements
### Doctor dashboard
- “Request Lab” modal (already exists): convert to create `lab_order`
- Widget: “My ordered tests” + statuses

### Lab dashboard
- Worklist tabs by status
- Row actions:
  - Mark sample collected/received/processing
  - Upload report (result_ready)
  - Release
  - Request re-test

### Patient dashboard
- Lab reports list: show test name, date, download report, status “pending/ready”.

---

## 7) Notifications
On `released`:
- notify patient + doctor (see messaging/notifications PRD)

---

## 8) Acceptance Criteria
- Doctor can place an order and lab sees it in “ordered” queue.
- Lab can transition status and upload report.
- Patient only sees reports after `released`.
- Doctor receives notification when a report is released.





