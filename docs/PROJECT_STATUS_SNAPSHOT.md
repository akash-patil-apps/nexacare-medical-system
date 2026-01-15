# NexaCare — Current Project Status Snapshot (as of 2026-01-01)

> **Purpose**: a factual snapshot of what the codebase currently supports, so we can compare it to a “complete HMS” and plan IPD/ADT/billing/etc.

---

## 1) Tech Stack
- **Frontend**: React 18 + TypeScript + Vite, Ant Design, React Query, Wouter, Dayjs
- **Backend**: Node.js + Express (TypeScript via `tsx`), Zod validation
- **DB**: PostgreSQL (Neon supported), Drizzle ORM + drizzle-kit migrations
- **Real-time / sync**: event routes + appointment events + cross-tab sync patterns in client

---

## 2) Roles Present in Product
- **Patient**
- **Receptionist**
- **Doctor**
- **Hospital (Admin)**
- **Lab (Lab Technician)**

---

## 3) Implemented Functional Areas (High Signal)

### 3.1 Authentication & onboarding
- Multi-role registration/login and onboarding flows exist under `client/src/pages/auth/*` and `client/src/pages/onboarding/*`.
- Backend auth routes and middleware exist under `server/routes/auth.routes.ts` and `server/middleware/auth.ts`.

### 3.2 OPD Appointment booking (patient)
- Patient can book appointment via `client/src/pages/book-appointment.tsx`
- Appointment lifecycle uses statuses like **pending/confirmed/completed/cancelled** (status logic centralized in `client/src/lib/appointment-status.ts`)

### 3.3 Receptionist operations
- Receptionist dashboard at `client/src/pages/dashboards/receptionist-dashboard.tsx`
- Supports:
  - Viewing and filtering appointments
  - Confirming pending appointments
  - Rejecting/cancelling with reason (predefined reasons UI) so patient can see it
  - Walk-in appointment registration (booked by receptionist; configured to auto-confirm for walk-in)
  - Patient age column in appointment table (DOB pulled via appointment queries)
  - Notification sounds for new/pending/confirmation/cancellation events

### 3.4 Doctor workflows
- Doctor dashboard at `client/src/pages/dashboards/doctor-dashboard.tsx`
- Supports:
  - Viewing schedule (today/confirmed)
  - Prescription creation flow (see prescriptions pages)
  - Patient age column
  - Notification sound on new confirmed appointments

### 3.5 Patient portal
- Patient appointments page `client/src/pages/dashboards/patient-appointments.tsx`
  - Upcoming vs past split
  - Cancelled appointments shown under upcoming with cancellation reason
- Patient dashboard `client/src/pages/dashboards/patient-dashboard.tsx` (KPIs + quick actions)

### 3.6 Prescriptions
- Doctor prescriptions: `client/src/pages/dashboards/doctor-prescriptions.tsx`
- Patient prescriptions: `client/src/pages/dashboards/patient-prescriptions.tsx`
- Backend routes/services exist: `server/routes/prescriptions.routes.ts`, `server/services/prescriptions.service.ts`

### 3.7 Labs / lab reports (partial)
- Lab dashboard page exists: `client/src/pages/dashboards/lab-dashboard.tsx`
- Backend routes/services exist: `server/routes/labs.routes.ts`, `server/services/lab.service.ts`
- UI and order lifecycle appear incomplete vs a full LIS (sample collection → processing → validation → release)

### 3.8 Notifications (partial)
- Notification routes/services exist: `server/routes/notifications.routes.ts`, `server/services/notifications.service.ts`
- Client has a sound utility at `client/src/lib/notification-sounds.ts` used across dashboards

---

## 4) What’s NOT Implemented Yet (Major HMS/HIS Gaps)
- **IPD / ADT** (Admission/Discharge/Transfer)
- **Bed/ward/room management**
- **Nursing station workflows** (vitals charts, eMAR, care plans)
- **Pharmacy inventory + dispensing**
- **Billing/insurance/TPA** end-to-end (tariffs, packages, deposit, settlement, claims)
- **OT scheduling + surgical documentation**
- **RIS/PACS integrations** and complete LIS workflow
- **Compliance-grade audit logs**, advanced RBAC, data retention

---

## 5) Why This Matters
Right now NexaCare is a **strong OPD + multi-role appointment/prescription foundation**. To become a *complete hospital management system*, we need to build IPD/ADT + billing + nursing + bed management and integrate pharmacy + diagnostics workflows.












