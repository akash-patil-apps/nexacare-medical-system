# PRD — Appointment Rescheduling (Patient + Receptionist + Doctor Leave/Bulk)

**Product**: NexaCare Medical System  
**Module**: OPD Scheduling  
**Primary Roles**: Patient, Receptionist  
**Secondary Roles**: Doctor, Hospital Admin  
**Status**: Proposed (implementation-ready)

---

## 1) Problem Statement

Real OPD scheduling always requires rescheduling:
- Patient can’t come
- Doctor is delayed/on leave
- Slot is overbooked or clinic timing changes

Today NexaCare supports booking + receptionist confirm + cancel, but **rescheduling is missing**. This creates operational gaps and poor patient experience.

---

## 2) Goals

### Goals (v1)
- Allow **patient** to request reschedule for eligible appointments.
- Allow **receptionist** to reschedule:
  - individual appointment
  - **bulk reschedule** when a doctor is unavailable
- Maintain correct appointment history and show patient “why/what changed”.
- Prevent invalid reschedules (past dates, unavailable slots, cancelled/completed).

### Non-Goals (v1)
- Automated optimization (AI slot fitting)
- Insurance/TPA impacts
- Billing adjustments (handled by Billing PRD)

---

## 3) Definitions
- **Reschedule**: change appointment date/time/slot while keeping the same appointment identity (or creating a linked replacement, depending on approach).
- **Reschedule request**: patient asks; receptionist approves/executes.
- **Bulk reschedule**: doctor clinic unavailable → system moves many appointments.

---

## 4) Current Baseline (Observed)

Existing:
- `POST /api/appointments` book
- `PATCH /api/appointments/:id/confirm` receptionist confirms
- `PATCH /api/appointments/:id/cancel` cancel w/reason
- `PATCH /api/appointments/:id/status` doctor marks completed
- Slot availability is checked in booking flows using doctor/date appointment queries.

Missing:
- Any `reschedule` endpoint
- Any UI for reschedule (patient / receptionist)
- Audit trail for schedule changes

---

## 5) User Stories

### Patient
1. I can request reschedule for an **upcoming** appointment.
2. I can pick from available slots for the same doctor/hospital (or request “any slot”).
3. I can see reschedule status: requested / approved / rejected.

### Receptionist
1. I can reschedule a patient appointment to a new slot (same doctor) instantly.
2. I can reschedule to a different doctor within same specialty (optional v1.1).
3. I can bulk reschedule all appointments for Dr. X on date Y to next available date/slots.
4. I can send/select a reason (doctor unavailable / patient requested / clinic timing change).

### Doctor
1. I can mark unavailability for a date/time window (optional v1.1), triggering reschedule workflow.

### Hospital Admin
1. I can set policies:
  - reschedule cutoff window (e.g., not allowed within 2 hours)
  - maximum reschedules per appointment

---

## 6) Workflow Specifications

### 6.1 Patient-initiated reschedule request (v1)
**Eligibility**:
- Appointment status in: `pending`, `confirmed`, `checked-in` (configurable; default exclude checked-in)
- Not `completed`, not `cancelled`, not past date

Flow:
1. Patient opens “My Appointments”
2. Click **Reschedule**
3. Chooses new date/time slot
4. System validates slot availability
5. Creates a **reschedule request** with status `requested`
6. Patient sees “Reschedule requested (awaiting confirmation)”
7. Receptionist sees a queue of reschedule requests and can approve/deny.

### 6.2 Receptionist reschedules directly (v1)
Flow:
1. Receptionist selects appointment
2. Click **Reschedule**
3. Picks new date/slot (and optionally reason)
4. System updates appointment and notifies patient
5. Status transition:
   - If appointment was `pending`: remain `pending` (or auto-confirm? policy)
   - If `confirmed`: remain `confirmed`
   - Reset check-in if already checked-in (policy: disallow reschedule if checked-in)

### 6.3 Bulk reschedule due to doctor unavailability (v1)
Flow:
1. Receptionist selects doctor + date range (e.g., “tomorrow” or “Jan 10”)
2. Click **Bulk reschedule**
3. Choose policy:
   - **Option A**: Move to next day same time slot if available
   - **Option B**: Move to nearest available slot on chosen date(s)
   - **Option C**: Convert to “reschedule required” and contact patients manually (fallback)
4. System:
   - iterates appointments in scope (pending/confirmed)
   - assigns new slots or sets `reschedule_required`
   - records reason “Doctor unavailable”
5. Patients are notified.

---

## 7) Data Model (Proposed)

### 7.1 New table: `appointment_reschedules`
Fields:
- `id` (PK)
- `appointmentId` (FK, unique per request if you allow only one active request)
- `requestedByRole` (`PATIENT` | `RECEPTIONIST` | `HOSPITAL`)
- `requestedByUserId`
- `oldDate`, `oldTimeSlot`
- `newDate`, `newTimeSlot`
- `status`:
  - `requested`
  - `approved`
  - `rejected`
  - `applied` (optional; if approval and application are separate)
- `reasonCategory`:
  - `patient_requested`
  - `doctor_unavailable`
  - `clinic_timing_change`
  - `overbooked`
  - `other`
- `reasonNote` (free text)
- `createdAt`, `updatedAt`

### 7.2 Appointment table adjustments (optional but recommended)
- Add `rescheduledFromId` (self reference) **OR**
- Add `rescheduleCount` + `lastRescheduledAt`

Recommendation for v1 simplicity:
- **Update the same appointment row** (keep appointmentId constant)
- Store history in `appointment_reschedules`

---

## 8) API Design (Proposed)

### 8.1 Patient
- `POST /api/appointments/:id/reschedule-request`
  - body: `{ newDate: 'YYYY-MM-DD', newTimeSlot: 'HH:mm-HH:mm' }`
  - returns: reschedule request

### 8.2 Receptionist
- `PATCH /api/appointments/:id/reschedule`
  - body: `{ newDate, newTimeSlot, reasonCategory, reasonNote }`
  - effect: apply immediately + write history

- `GET /api/appointments/reschedule-requests` (receptionist/hospital)
  - filter: by doctor/date/status

- `PATCH /api/appointments/reschedule-requests/:requestId/approve`
- `PATCH /api/appointments/reschedule-requests/:requestId/reject`

### 8.3 Bulk
- `POST /api/appointments/bulk-reschedule`
  - body:
    - `doctorId`
    - `date` or `dateRange`
    - `policy` (A/B/C)
    - optional `targetDate` or `dateWindow`
  - returns: summary `{ total, rescheduled, requiresManual, failed }`

---

## 9) UI Requirements (v1)

### 9.1 Patient “My Appointments”
- Add **Reschedule** button for eligible appointments (beside Cancel)
- Reschedule modal:
  - date picker
  - available slots list (reuse booking slot availability logic)
  - confirm request
- Show current state:
  - “Reschedule requested”
  - “Rescheduled to …”
  - “Reschedule rejected: …”

### 9.2 Receptionist dashboard
- Appointment row action: **Reschedule** (clock/edit icon)
- Modal:
  - select new date/slot
  - reason dropdown
  - submit
- Add tab/section: “Reschedule Requests” (if patient requests are enabled)
- Bulk reschedule tool (drawer):
  - doctor selector
  - date selector
  - policy selector
  - preview list + execute

### 9.3 Notifications (in-app + sound)
- On applied reschedule: patient gets notification (and optional sound)
- For bulk: patients notified individually (and reception sees summary)

---

## 10) Business Rules (v1 defaults)
- Reschedule allowed only for future appointments.
- Disallow reschedule if:
  - appointment is cancelled/completed
  - within X minutes of start time (configurable; default 120 minutes)
  - already checked-in (default disallow)
- Max reschedules per appointment: 2 (configurable).

---

## 11) Edge Cases
- Slot becomes unavailable between UI selection and submit → server re-validates and fails gracefully.
- Bulk reschedule cannot find enough slots → mark `reschedule_required` + notify receptionist.
- Patient requests reschedule but receptionist denies → show denial reason to patient.

---

## 12) Acceptance Criteria
- Patient can request reschedule and sees the request status.
- Receptionist can reschedule an appointment and patient sees updated date/time.
- Bulk reschedule produces a deterministic summary and updates appointments correctly.
- All reschedules are recorded in history and visible to receptionist (and patient, minimal).




