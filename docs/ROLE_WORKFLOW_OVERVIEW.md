# NexaCare Role Workflows & Feature Status

## Overview
- Patient → Receptionist → Doctor → Admin loop already functions end-to-end: patients book, receptionists confirm/check-in, doctors complete appointments and create prescriptions, admins oversee data; dashboards vary in maturity.
- React Query caching plus cross-tab/localStorage events keep role dashboards synchronized after each status transition.
- Reusable dashboard components (`KpiCard`, `QuickActionTile`, `PrescriptionCard`, `TimelineItem`, `NotificationItem`) and the `DASHBOARD_STYLE_GUIDE.md` define layout, palette, and interaction tokens for all roles.

## Patient Experience
- **Current Features**
  - Full-page appointment booking with hospital search, doctor filtering, date/time selection, and confirmation summary. Bookings start in `pending` status (visible only to receptionists).
  - Redesigned patient dashboard using reusable cards; shows KPIs, quick actions, prescriptions, care timeline, notifications, and lab entries.
  - Prescription feed with unread badge, mark-as-read persistence, and downloadable artifacts; notifications rely on updated backend routes.
  - **Fully responsive design** with mobile drawer navigation, horizontal scrolling KPI cards, and adaptive layouts.
  - **Fixed onboarding flow** with proper form value preservation and redirect loop prevention.
- **Needs Work**
  - Integrate lab report download/upload module directly into dashboard.
  - Add appointment rescheduling, tele-consult links, billing history, and richer health timeline.
- **Future Scope**
  - Symptom tracker, care plan reminders, chat with care team, prescription refill requests, insurance claim tracking, wearable integrations.

## Receptionist Experience
- **Current Features**
  - Dashboard supports confirming pending appointments (`pending → confirmed`) and checking-in patients on arrival.
  - Cross-tab notifications update patient and doctor dashboards immediately after receptionist actions.
  - **Migrated to new design system** with role-specific theme colors and reusable components.
  - Enhanced appointment filtering with tabs for Today, Tomorrow, and future dates.
  - Includes cancelled appointments for tracking purposes.
- **Needs Work**
  - Apply responsive design (mobile drawer, responsive KPIs, etc.).
  - Add queues, quick actions for walk-ins and rescheduling, notes panel, patient lookup, overdue alerts.
- **Future Scope**
  - Triage checklist, automated SMS/email reminders, payment tracking, bed availability integration, operational reporting exports.

## Doctor Experience
- **Current Features**
  - Dashboard redesigned with doctor palette, sticky sidebar, KPI and quick action modules.
  - Today’s schedule table includes “Add Prescription” action column that pre-fills patient + appointment context.
  - Quick actions show unattended patients only; backend Drizzle queries fixed for stable data retrieval.
- **Needs Work**
  - Add lab results widget, follow-up scheduling hints, teleconsult link generator, analytics for completed appointments, tasks/reminders module, notification center for lab/patient updates.
- **Future Scope**
  - AI-assisted notes, voice dictation, e-signatures, on-call toggles, referral management, specialty-specific dashboards.

## Hospital Admin Experience
- **Current Features**
  - **Migrated to new design system** with hospital-specific theme (purple/sky blue palette).
  - KPI cards for Total Doctors, Total Patients, Today's Appointments, Monthly Revenue.
  - Quick action tiles for staff management and reporting.
- **Needs Work**
  - Apply responsive design (mobile drawer, responsive KPIs, etc.).
  - Add staff roster management, approval workflows, compliance alerts, audit log access, notification center.
- **Future Scope**
  - Financial analytics, staffing forecasts, multi-facility management, SLA monitoring, ERP/billing integrations, incident response tools.

## Lab Technician Experience
- **Current Features**
  - Lab report endpoints (`/api/labs/patient/reports`) available; patient timeline can show lab entries.
  - **Migrated to new design system** with lab-specific theme (sky blue/green palette).
  - KPI cards for Samples Pending, Reports Ready, Critical Alerts, Total Tests.
  - Quick action tiles for sample logging and report management.
- **Needs Work**
  - Apply responsive design (mobile drawer, responsive KPIs, etc.).
  - Include queue of pending lab orders, upload workflow with status states (`processing`, `ready`), communication channel with doctors, sample tracking, auto-notify patient/doctor when results are ready.
- **Future Scope**
  - Device integrations (HL7), quality control dashboards, billing linkage, courier scheduling, external lab network support.

## System Admin / Superuser
- **Current Features**
  - Credentials documented; user management and system status views exist from prior iterations.
- **Needs Work**
  - Central dashboard aligned with new design, monitoring for notification subsystem, configuration of appointment rules, audit controls.
- **Future Scope**
  - Role management UI, feature flags, data retention policies, compliance dashboards, SOC2 logging, multi-tenant settings.

## Cross-Role Dynamics
- Appointment status transitions: patient booking (`pending`) → receptionist confirmation (`confirmed`) → doctor completion (`completed`) → patient timeline updates; cancellation available to patient/receptionist.
- Prescriptions: doctor issues, patient sees instantly; future plan to notify labs and admins automatically.
- Notifications: backend supports fetch and mark-as-read; currently integrated on patient dashboard with expansion planned.
- Lab coordination: endpoints ready; need UI hooks so doctors can request labs, lab technicians manage status, and patients receive updates.
- Admin oversight: should monitor entire pipeline, approvals, compliance; upcoming dashboards will provide KPIs and alerts.

## Shared Assets & Infrastructure
- Design references in `docs/DASHBOARD_STYLE_GUIDE.md`, `docs/PATIENT_DASHBOARD_SPEC.md`, `docs/PATIENT_DASHBOARD_IMPLEMENTATION.md`.
- Frontend components under `client/src/components/dashboard/` ready for reuse across roles.
- Backend services for appointments, prescriptions, notifications, lab routes are stabilized with corrected Drizzle queries.
- Utility scripts support seeding, data fixes, and testing across roles.

## Platform Roadmap Highlights
- WebSocket upgrade for live notifications post-dashboard migration.
- Appointment rescheduling, reminders automation, telemedicine modules, payment flows, insurance verification.
- Analytics suite per role, accessibility/localization upgrades.
- EMR/EHR integrations, e-prescription compliance, audit-ready logging, security hardening.

