# PRD — Messaging + Notifications (In‑App + SMS/WhatsApp) (v1)

**Primary Roles**: Patient, Receptionist, Doctor  
**Secondary Roles**: Hospital Admin, Lab  
**Goal**: operational communication + reliable alerts for status changes.

---

## 1) Problem
Dashboards show placeholders for messaging; notifications are inconsistent per role and largely in-app only. Hospitals need:
- appointment confirmations/cancellations/reschedules notifications
- patient↔reception/doctor messaging (at least lightweight)
- auditability (who said what)

---

## 2) Goals (v1)
- In-app notification center for all roles (list + unread count + mark read).
- Messaging threads (patient ↔ hospital/reception; doctor messaging optional).
- Outbound delivery adapters:
  - SMS (gateway)
  - WhatsApp (provider)
  - Email (optional)
- Event-driven triggers from appointments/labs/billing.

Non-goals v1: full teleconsult chat/video, attachments heavy workflow.

---

## 3) Event Triggers (v1)
- Appointment:
  - created (pending)
  - confirmed
  - cancelled (with reason)
  - rescheduled
  - checked-in
  - completed
- Lab:
  - order created
  - report ready
  - critical alert (v2)
- Billing:
  - invoice issued
  - payment received

---

## 4) Data Model (Proposed)
### `notifications`
- `id`, `hospitalId`, `recipientUserId`, `recipientRole`
- `type` (enum: appointment_confirmed, appointment_cancelled, lab_ready, invoice_issued, etc.)
- `title`, `body`
- `entityType` + `entityId` (e.g., appointment/123)
- `priority` (info/warn/urgent)
- `isRead`, `readAt`
- `createdAt`

### `message_threads`
- `id`, `hospitalId`
- `type`: `patient_support` | `doctor_patient` (optional)
- `patientUserId`
- `assignedUserId` (receptionist/doctor)
- `status`: open/closed
- `createdAt`, `updatedAt`

### `messages`
- `id`, `threadId`
- `senderUserId`
- `messageText`
- `channel`: in_app | sms | whatsapp
- `deliveryStatus`: queued/sent/delivered/failed
- `createdAt`

---

## 5) APIs (Proposed)
### Notifications
- `GET /api/notifications/my`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

### Messaging
- `GET /api/messages/threads/my`
- `POST /api/messages/threads` (create patient support thread)
- `GET /api/messages/threads/:id`
- `POST /api/messages/threads/:id/messages` (send)
- `PATCH /api/messages/threads/:id/close`

### Delivery adapters (server internal)
- `sms.service.ts`, `whatsapp.service.ts` provider integration (config via env)

---

## 6) UI Requirements
### Patient
- “Messages” page:
  - list threads
  - chat view
- Notification bell + list

### Receptionist
- Inbox: open patient threads, reply, close
- Notifications panel for new pending/reschedule requests

### Doctor (v1 minimal)
- Notification bell + list (lab ready, reschedules, new confirmed)
- Messaging optional v1.1

---

## 7) Rules
- Patient messaging is always tied to a hospital (multi-tenant).
- Rate limit outbound SMS/WhatsApp.
- Store cancellation/reschedule reasons and include them in notifications.

---

## 8) Acceptance Criteria
- Every role sees an unread notification count that updates after events.
- Patient can open a thread and receive replies from receptionist.
- Appointment confirm/cancel/reschedule emits notification + optional SMS/WhatsApp.






