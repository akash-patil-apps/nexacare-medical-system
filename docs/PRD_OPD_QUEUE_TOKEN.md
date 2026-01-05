# PRD — OPD Queue / Token Management (Receptionist + Doctor)

**Product**: NexaCare Medical System  
**Module**: OPD Operations  
**Primary Roles**: Receptionist, Doctor  
**Secondary Roles**: Patient, Hospital Admin  
**Status**: Proposed (ready for implementation planning)

---

## 1) Problem Statement

Today NexaCare supports appointment booking + confirmation + check-in, but **real OPD operations run on a queue**:
- Patients arrive at different times
- Walk-ins must be inserted
- Doctor handles “Now Serving”, skips, returns, emergencies

Without a queue/token system:
- Receptionists can’t control patient flow
- Doctors don’t get a live “who’s next” list
- No token number exists to show to patient / call out

---

## 2) Goals / Outcomes

### Goals
- Add a **token/queue** workflow for OPD per doctor per day.
- Enable receptionist to:
  - assign tokens at arrival,
  - reorder,
  - mark no-show,
  - handle walk-ins.
- Enable doctor to:
  - see “Now Serving” + next patients,
  - mark “in consultation” and “done”.

### Non-Goals (v1)
- IPD/ADT (admission/bed transfer/discharge)
- Billing/payment collection
- Tele-consult room (video)
- Complex triage scoring (basic priority only)

---

## 3) Current System Baseline (Observed)

Already exists:
- Appointment booking
- Receptionist confirm/reject/cancel with reason
- Receptionist check-in endpoint: `PATCH /api/appointments/:id/check-in`
- Doctor can mark appointment completed via `PATCH /api/appointments/:id/status`

Missing:
- Token number assignment
- Queue ordering / “Now Serving”
- No-show workflow
- Walk-in insertion into doctor’s queue

---

## 4) User Stories (Role-based)

### Receptionist
1. As a receptionist, I can **check-in** a patient and automatically assign a **token number** for the selected doctor/day.
2. As a receptionist, I can **create a walk-in** and place them in the queue (auto-confirmed if walk-in).
3. As a receptionist, I can **reorder** tokens (drag/drop or move up/down).
4. As a receptionist, I can **skip** a token and mark it as “no-show” after X minutes (manual in v1).
5. As a receptionist, I can **call** a token and update its status to “called”.

### Doctor
1. As a doctor, I can see my **live queue** with token numbers.
2. As a doctor, I can mark a token as **In Consultation**, then **Completed**.
3. As a doctor, I can **skip/return** a patient (if not present).

### Patient (v1 minimal)
1. As a patient, I can see (or be told) my **token number** at check-in.
2. As a patient, I can see the appointment status updates (already present).

### Hospital Admin
1. As admin, I can configure basic queue rules (token starts from 1 each day, per doctor).

---

## 5) Workflow (Real-Life Mapping)

### 5.1 Online appointment (existing)
- Patient books → status pending → receptionist confirms.

### 5.2 Arrival at hospital (new token workflow)
1. Receptionist opens **Today’s appointments** filtered by doctor.
2. Patient arrives → receptionist clicks **Check-in**
3. System:
   - sets appointment status = **checked-in** (already exists)
   - assigns **tokenNumber** (new)
   - inserts row into doctor/day queue (new)
4. Receptionist can optionally press **Call** (sets queue status called).

### 5.3 Walk-in
1. Receptionist registers walk-in and books walk-in appointment (existing booking flow).
2. On booking (walk-in auto-confirmed), receptionist **Check-in** immediately.
3. Token assigned and inserted into queue.

### 5.4 Doctor consult loop
1. Doctor sees queue with:
   - Now Serving
   - Next up
   - Waiting list
2. Doctor marks:
   - **Start consultation** → appointment status = in_consultation (new endpoint/state)
   - Creates prescription (existing)
   - **Complete** → appointment status = completed (already exists)

### 5.5 No-show
Receptionist/doctor can mark a token:
- **No-show** (new queue status)
- Optionally “return” later (moves back to waiting and new order).

---

## 6) Data Model (Proposed)

### 6.1 Minimal new table: `opd_queue_entries`
Fields (suggested):
- `id` (PK)
- `hospitalId`
- `doctorId`
- `appointmentId` (nullable for pure walk-in token; but preferred: always tie to appointment)
- `patientId`
- `queueDate` (YYYY-MM-DD in IST)
- `tokenNumber` (int)
- `position` (int) — order in queue (can equal tokenNumber initially)
- `status` (enum):
  - `waiting`
  - `called`
  - `in_consultation`
  - `completed`
  - `skipped`
  - `no_show`
  - `cancelled`
- timestamps:
  - `checkedInAt`
  - `calledAt`
  - `consultationStartedAt`
  - `completedAt`
  - `updatedAt`
- `notes` (optional)

Constraints:
- Unique `(doctorId, queueDate, tokenNumber)`
- Unique `(appointmentId)` (1 appointment should map to 1 queue entry)

### 6.2 Appointment table changes (optional)
If we want token visible without joining queue table:
- Add `tokenNumber` and `checkedInAt` columns to appointments

Recommendation:
- Keep queue-specific fields in `opd_queue_entries`; use joins where needed.

---

## 7) API Design (Proposed)

All routes require auth.

### 7.1 Receptionist
- `POST /api/opd-queue/check-in`
  - body: `{ appointmentId }`
  - effect: assigns token + creates queue entry + marks appointment checked-in (or calls existing check-in)
- `PATCH /api/opd-queue/:queueEntryId/call`
- `PATCH /api/opd-queue/:queueEntryId/reorder`
  - body: `{ position }` OR `{ move: 'up'|'down' }`
- `PATCH /api/opd-queue/:queueEntryId/no-show`
- `GET /api/opd-queue/doctor/:doctorId/date/:yyyyMmDd`

### 7.2 Doctor
- `PATCH /api/opd-queue/:queueEntryId/start`
  - effect: appointment status → `in_consultation`
- `PATCH /api/opd-queue/:queueEntryId/complete`
  - effect: appointment status → `completed` (or calls existing `/appointments/:id/status`)

### 7.3 Events/Real-time
Emit “queue changed” events to update receptionist + doctor dashboards:
- event: `opd_queue_changed` with `{ doctorId, queueDate }`

---

## 8) UI/UX Requirements

### 8.1 Receptionist Dashboard additions
- **Queue Panel** (per doctor, Today):
  - token list with statuses
  - actions: Call, Move up/down, No-show, Return-to-waiting
- **Check-in** button should show the assigned token immediately (toast + column).
- Add **Token** column to appointments table (today).

### 8.2 Doctor Dashboard additions
- “Today Queue” widget:
  - Now Serving (big)
  - Next 3
  - Full list in drawer/tab
- Actions: Start consultation, Mark done (requires Rx or allow without Rx based on rule)

### 8.3 Patient (optional v1)
- Show token number for today appointment once checked-in.

---

## 9) Permissions & Rules

### Permissions
- Receptionist: create/reorder/call/no-show
- Doctor: start/complete + optionally call/no-show
- Patient: read own token (optional)

### Rules (v1)
- Token numbering resets daily per doctor.
- Reordering changes `position` not `tokenNumber` (token remains stable).
- Cancelled appointments auto-mark queue entry as cancelled.

---

## 10) Edge Cases
- Two receptionists check-in same appointment concurrently → enforce unique appointmentId constraint.
- Doctor changes clinic hours mid-day → queue stays; reschedule handled separately.
- Walk-in without patient profile (should not happen; registration required first).
- Timezone: queueDate must be computed in IST consistently (use existing timezone utils).

---

## 11) Acceptance Criteria (Testable)
- Receptionist check-in assigns a token and shows it in UI immediately.
- Doctor sees the same token list within 3 seconds (polling/event).
- Reorder persists and is reflected on doctor dashboard.
- Mark “start consultation” updates status and timestamps.
- Mark “complete” moves entry to completed and removes from active queue.
- No-show marks entry and it no longer appears in active “waiting” list.

---

## 12) Implementation Notes (Suggested Order)
1. DB migration: create `opd_queue_entries`
2. Server routes/services for queue
3. Add token column to receptionist appointment list and wire “check-in” to create queue entry
4. Add doctor queue widget and actions
5. Add events + client subscriptions for instant refresh




