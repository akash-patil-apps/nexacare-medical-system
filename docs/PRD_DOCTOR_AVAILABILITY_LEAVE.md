# PRD — Doctor Availability, Leave & Schedule Overrides (OPD)

**Primary Roles**: Doctor, Receptionist, Hospital Admin  
**Secondary Roles**: Patient  
**Depends on**: `PRD_APPOINTMENT_RESCHEDULING.md`

---

## 1) Problem
Clinics need a single truth for when a doctor is available. Today availability is mostly implied by slots; “doctor unavailable” flows are placeholders and bulk reschedule is manual.

---

## 2) Goals (v1)
- Doctor/Hospital can set **availability windows** and **exceptions/leave**.
- Receptionist can mark doctor unavailable for a day (override) and trigger **bulk reschedule**.
- Patient booking only shows valid slots and blocks unavailable windows.

Non-goals v1: complex rostering, multi-location rotations, on-call.

---

## 3) Data Model (Proposed)
### `doctor_availability_rules`
- `id`, `doctorId`, `hospitalId`
- `dayOfWeek` (0-6)
- `startTime` / `endTime` (HH:mm, IST)
- `slotDurationMinutes`
- `maxPatientsPerSlot`
- `isActive`

### `doctor_availability_exceptions`
- `id`, `doctorId`, `hospitalId`
- `date` (YYYY-MM-DD IST)
- `type`: `leave` | `override_hours` | `blocked`
- `startTime`/`endTime` (nullable for full-day leave)
- `reason`
- `createdByUserId`

---

## 4) APIs (Proposed)
- `GET /api/availability/doctor/:doctorId` (rules + upcoming exceptions)
- `POST /api/availability/doctor/:doctorId/rules` (admin/doctor)
- `POST /api/availability/doctor/:doctorId/exceptions` (doctor/admin/receptionist)
- `DELETE /api/availability/exceptions/:id`

Trigger:
- `POST /api/appointments/bulk-reschedule` when exception blocks existing appointments (see rescheduling PRD)

---

## 5) UI Requirements
### Doctor dashboard
- “Availability” page:
  - weekly schedule editor
  - add leave / block dates
  - view impacted appointments count

### Receptionist dashboard
- Quick action: “Doctor unavailable today”
- Bulk reschedule wizard entry point

### Booking page (patient)
- Slot list must respect availability rules + exceptions.

---

## 6) Rules
- Exceptions override weekly rules.
- If leave added for a date with confirmed/pending appointments → require:
  - (a) bulk reschedule attempt OR
  - (b) mark `reschedule_required` + notify patients

---

## 7) Acceptance Criteria
- Unavailable dates no longer show slots for booking.
- Receptionist/doctor can add leave and impacted appointments are surfaced.
- Bulk reschedule can be triggered from leave creation flow.




