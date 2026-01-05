# PRD — Radiology (RIS) + Reporting (+ PACS Outline) (v1)

**Primary Roles**: Doctor, Radiology Technician, Radiologist  
**Secondary Roles**: Patient, Receptionist, Hospital Admin  
**Goal**: radiology ordering + scheduling + reporting (PACS integration optional outline).

---

## 1) Problem
Hospitals need imaging orders and radiology reporting similar to lab, but with modality scheduling and radiologist sign-off. NexaCare currently has no RIS workflow.

---

## 2) Goals (v1)
- Doctor can create imaging orders (XR/USG/CT/MRI).
- Radiology can manage a worklist and upload/report results.
- Patient can view released reports.

Non-goals v1: DICOM viewer and PACS storage (outline only).

---

## 3) Lifecycle States (v1)
`ordered` → `scheduled` → `performed` → `reported` → `released`

---

## 4) Data Model (Proposed)
### `radiology_orders`
- `id`, `hospitalId`, `patientId`, `appointmentId?`, `orderedByDoctorId`
- `modality` (XR/USG/CT/MRI)
- `studyName`
- `priority`
- `status`
- `scheduledAt`, `performedAt`, `releasedAt`

### `radiology_reports`
- `id`, `radiologyOrderId`
- `reportText` (v1) + `attachments` (pdf/image)
- `signedOffByUserId`, `signedOffAt`

---

## 5) APIs (Proposed)
- `POST /api/radiology/orders` (doctor)
- `GET /api/radiology/orders/my` (doctor)
- `GET /api/radiology/orders/worklist?status=` (radiology)
- `PATCH /api/radiology/orders/:id/status`
- `POST /api/radiology/orders/:id/report` (upload/report)
- `PATCH /api/radiology/orders/:id/release`
- `GET /api/radiology/my/reports` (patient)

---

## 6) UI Requirements
- Doctor: “Request Imaging” modal similar to lab request.
- Radiology dashboard: worklist by status + report editor/upload + release.
- Patient: imaging reports list (released only).

---

## 7) PACS/DICOM (Outline for v2)
- Store `dicomStudyUid`, `seriesUids`, PACS endpoint metadata.
- Integrate with external PACS and provide viewer link rather than storing DICOM in NexaCare.

---

## 8) Acceptance Criteria
- Doctor order appears in radiology worklist.
- Radiology can progress states and release a report.
- Patient can view/download released report.




