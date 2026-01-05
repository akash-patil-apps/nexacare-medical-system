# PRD — Audit Logs + RBAC/Permissions + Compliance Basics (v1)

**Primary Roles**: Hospital Admin, System Admin  
**Secondary Roles**: All roles  
**Goal**: make the system trustworthy for hospitals (who changed what, when, and why).

---

## 1) Problem
Healthcare systems need auditability and strict permissions. Today, role checks exist, but there’s no standardized audit log for critical actions (cancel, reschedule, billing, IPD changes).

---

## 2) Goals (v1)
- Central audit log capturing high-risk actions.
- Stronger RBAC:
  - role + scope checks (hospitalId scoping)
  - permission flags (e.g., “canApproveDiscount”)
- Basic compliance guardrails:
  - immutable audit records
  - export for admins

Non-goals v1: full SOC2/HIPAA program, advanced SIEM integrations.

---

## 3) Audit Events (v1)
Record events for:
- Appointment: confirm, cancel (with reason), check-in, reschedule, status changes
- Billing: invoice issued, payment recorded, refund
- IPD: admit, transfer, discharge, bed status change
- Lab/Radiology: order created, report released
- Auth: login attempts, OTP verification (optional)

---

## 4) Data Model (Proposed)
### `audit_logs`
- `id`
- `hospitalId`
- `actorUserId`
- `actorRole`
- `action` (string/enum)
- `entityType`, `entityId`
- `before` (json) / `after` (json) (store only relevant fields)
- `ipAddress` (if available)
- `userAgent` (if available)
- `createdAt`

### Permissions (two options)
Option A: `role_permissions` tables  
Option B (v1): static permission map in code + per-user overrides table

Minimal v1:
- `user_permissions`:
  - `userId`, `hospitalId`, `permissionKey`, `enabled`

---

## 5) APIs (Proposed)
- `GET /api/audit?hospitalId=&dateFrom=&dateTo=&action=&actorUserId=`
- `GET /api/audit/:id`

Admin-only.

---

## 6) Implementation Requirements
- Add a helper: `logAudit({ hospitalId, actor, action, entity, before, after })`
- Call it inside services (appointments.service.ts, billing service, ipd service, labs, radiology).
- Ensure hospital scoping for every read/write route.

---

## 7) UI Requirements
- Hospital Admin “Audit Log” page:
  - filters
  - event details drawer
  - export CSV (optional)

---

## 8) Acceptance Criteria
- Critical actions create audit entries.
- Hospital admin can search and view audit entries.
- Unauthorized cross-hospital data access is blocked.




