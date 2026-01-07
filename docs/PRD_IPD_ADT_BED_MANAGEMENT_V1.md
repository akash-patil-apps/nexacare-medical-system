# PRD — IPD ADT + Bed/Ward Management (v1)

**Primary Roles**: Admission Desk/Receptionist, Nurse, Doctor  
**Secondary Roles**: Hospital Admin, Patient, Billing  
**Goal**: introduce the minimum IPD backbone: ADT + bed occupancy + discharge workflow.

---

## 1) Problem
NexaCare is OPD-strong but lacks inpatient workflows. Hospitals require:
- Admission (create inpatient encounter)
- Bed allocation and transfers
- Discharge workflow + bed release

---

## 2) Goals (v1)
- Implement **ADT**:
  - admit patient
  - transfer bed/ward
  - discharge patient
- Implement ward/room/bed masters and live occupancy.
- Provide basic IPD encounter visibility for doctor/nurse.

Non-goals v1: IP billing/TPA, OT, ICU advanced charts.

---

## 3) Data Model (Proposed)
### Masters
- `wards` (hospitalId, name, type: general/icu/er, genderPolicy?, isActive)
- `rooms` (wardId, roomNumber, category: general/semi/private, isActive)
- `beds` (roomId, bedNumber, status: available/occupied/cleaning/blocked)

### Encounters
- `ipd_encounters`
  - `id`, `hospitalId`, `patientId`
  - `admittingDoctorId`, `attendingDoctorId`
  - `admissionType`: elective/emergency/daycare/observation
  - `status`: admitted/transferred/discharged
  - `admittedAt`, `dischargedAt`
  - `dischargeSummaryText` (v1 text)

### Bed allocation / transfers
- `bed_allocations`
  - `id`, `encounterId`, `bedId`
  - `fromAt`, `toAt`
  - `reason`

---

## 4) Workflow
### 4.1 Admit
1. Select patient (existing patient record)
2. Create IPD encounter (type, doctor)
3. Select bed (available only)
4. Set bed occupied + create bed allocation

### 4.2 Transfer
1. Choose new bed
2. Close previous allocation (`toAt`)
3. Create new allocation (`fromAt`)
4. Update bed statuses (old → cleaning/available, new → occupied)

### 4.3 Discharge
1. Doctor initiates discharge order
2. Nurse completes discharge checklist (v1 minimal)
3. Final discharge summary saved
4. Encounter status → discharged
5. Bed released → cleaning → available

---

## 5) APIs (Proposed)
- `POST /api/ipd/encounters` (admit)
- `GET /api/ipd/encounters/:id`
- `GET /api/ipd/encounters?hospitalId=&status=`
- `PATCH /api/ipd/encounters/:id/transfer` body `{ newBedId, reason }`
- `PATCH /api/ipd/encounters/:id/discharge` body `{ dischargeSummaryText }`

Masters:
- `GET/POST/PATCH /api/ipd/wards`, `/rooms`, `/beds` (hospital admin)

---

## 6) UI Requirements
### Admission desk (receptionist/hospital)
- IPD Admission screen:
  - patient search
  - admission form
  - bed picker with occupancy map

### Nurse station (v1 minimal)
- “My Ward” list:
  - current admitted patients + bed
  - discharge checklist button

### Doctor
- Inpatient list (my admitted)
- Open encounter: notes placeholder + discharge summary editor

---

## 7) Rules
- One active encounter per patient per hospital (configurable; default true).
- Bed cannot be double-occupied.
- Transfers require bed availability.

---

## 8) Acceptance Criteria
- Admit assigns a bed and marks it occupied.
- Transfer updates allocations and bed statuses correctly.
- Discharge releases bed and closes encounter.






