# Remaining Features & Work by Dashboard

**Last updated:** January 30, 2026  
**Purpose:** Per-dashboard view of what’s done vs what’s left to build or fix.

---

## Summary

| Dashboard        | Working well                                      | Remaining / to fix                                      |
|------------------|----------------------------------------------------|---------------------------------------------------------|
| **Patient**      | Book appointment, appointments, prescriptions, payments, profile, family members, messages, lab reports page, refill (with API), document upload page, patient history page, prescription detail view | Medicine reminders |
| **Receptionist**| Dashboard, queue, confirm/check-in, vitals, lab request, invoice, IPD, Contact Directory, `/receptionist/appointments` (upcoming + past by date), messages | No-show & pending payment KPIs (TODO in code), Settings |
| **Hospital Admin** | Dashboard, Appointments/IPD/Reports/Audit tabs, Revenue, messages (role route), past appointments by date on dashboard | Dedicated `/admin/appointments` page (like receptionist), Doctors/Patients/Lab Reports sidebar pages, View all appointments, Revenue export |
| **Doctor**       | Dashboard, appointments, prescriptions, IPD (admit, rounds, etc.) | Patients, Lab Reports, IPD Patients, Availability sidebar pages; Lab queue; Settings |
| **Lab**          | Pending orders, sample collection, result entry, report release | View all reports, Profile/Settings |
| **Pharmacist**   | Prescriptions, Inventory, Dispensing, PO, Suppliers, Stock movements | Low stock alerts from API, Patient counseling, Stock alerts, Profile |
| **Radiology**    | Pending orders, report creation, report release (UI) | Reports API alignment, Start/Perform imaging, Imaging procedure, Equipment, Scheduling, Profile |
| **Nurse**        | IPD list, assign nurse                            | eMAR link from dashboard, Nursing notes, Shift handover, Profile |

---

## 1. Patient Dashboard

**Routes:** `/dashboard/patient`, `/dashboard/patient/appointments`, `/dashboard/patient/prescriptions`, `/dashboard/patient/reports`, `/dashboard/patient/documents`, `/dashboard/patient/history`, `/patient/messages`, `/dashboard/profile`, `/book-appointment`

**Done**
- Login, register, OTP, forgot password, onboarding
- Book appointment (hospital → doctor → date → slot → pay), including “book for” family member
- My appointments (list, status, token, reschedule)
- My prescriptions
- Lab results via past appointments; **Lab reports (standalone)** at `/dashboard/patient/reports` (sidebar Lab icon)
- Payment (checkout / success / failure)
- Messages (in-app, role route `/patient/messages`)
- Profile: account info, family members, “Switch accounts” (acting patient), profile from onboarding
- Family members: add (with OTP for mobile, optional email), relationship, resume onboarding if profile already created
- **Prescription detail view:** “View Details” on prescription card opens modal with full prescription (PrescriptionPreview)
- **Refill request:** “Request Refill” on prescription card opens modal with optional notes; POST `/api/prescriptions/refill-request` notifies pharmacists and patient
- **Document upload:** `/dashboard/patient/documents` — Upload UI (storage integration coming later); linked from dashboard “Document upload” tile
- **Patient history:** `/dashboard/patient/history` — Timeline of appointments, prescriptions, and lab reports; linked from dashboard “Patient history” tile

**Remaining**
- **Medicine reminders:** Not implemented (prescription-based reminders / notifications)

---

## 2. Receptionist Dashboard

**Routes:** `/dashboard/receptionist`, `/receptionist/appointments`, `/dashboard/receptionist/contact-directory`, `/receptionist/messages`, `/dashboard/profile`

**Done**
- Main dashboard with queue, KPIs, today’s appointments
- Confirm / Check-in / Complete (temp → real token)
- Record vitals, request lab test, create invoice after check-in
- Walk-in / OTP registration
- IPD tab (admission, encounters list)
- **Appointments page:** `/receptionist/appointments` — upcoming + past appointments with date picker (sidebar Appointments icon)
- **Contact Directory:** `/dashboard/receptionist/contact-directory` — search by name, patient ID, mobile (backend fixed for mobile search)
- Messages (role route), Profile, family context not applicable

**Remaining**
- **No-show count:** TODO in code (currently 0)
- **Pending payments count:** TODO in code (currently 0)
- **Settings:** Header “Settings” still shows “Settings coming soon”

---

## 3. Hospital Admin Dashboard

**Routes:** `/dashboard/hospital`, `/dashboard/hospital/revenue`, `/admin/messages`, `/dashboard/profile`

**Done**
- Dashboard with KPIs and stats
- Tabs: Appointments (today/upcoming + past by date picker), IPD, Reports, Audit
- IPD: bed structure, occupancy, encounters
- Reports & Analytics (OPD, Lab, Finance, IPD census)
- Audit logs
- Revenue details page
- Messages (role route `/admin/messages`), Profile
- HospitalSidebar: Dashboard, Appointments (currently goes to dashboard), Messages, Revenue, Profile, Logout

**Remaining**
- **Dedicated appointments page:** No `/admin/appointments` yet (like `/receptionist/appointments`) — past/upcoming + date picker in one place when clicking Appointments in sidebar
- **Sidebar “Doctors / Patients / Lab Reports”:** Still “coming soon” in hospital dashboard (separate pages not built or linked)
- **View all appointments:** “View all appointments feature coming soon”
- **Revenue export:** CSV/PDF export (TODO in code; “Export feature coming soon”)

---

## 4. Doctor Dashboard

**Routes:** `/dashboard/doctor`, `/dashboard/doctor/appointments`, `/dashboard/doctor/prescriptions`, `/doctor/messages`, `/dashboard/profile`

**Done**
- Dashboard, today/upcoming appointments
- Create prescription from appointment
- View patient / vitals / lab in appointment row or drawer
- Doctor appointments and prescriptions pages
- IPD (encounters, admit, bed, rounds) in dashboard tabs
- Messages (role route)

**Remaining**
- **Sidebar:** “Patients page coming soon”, “Lab Reports page coming soon”, “IPD Patients page coming soon”, “Availability page coming soon”
- **Lab queue:** “Lab queue coming soon” on dashboard
- **Availability:** Availability management page (AvailabilityManager may exist; needs route + sidebar link)
- **Settings:** “Settings coming soon” in header

---

## 5. Lab Technician Dashboard

**Routes:** `/dashboard/lab`, `/lab/messages`, `/dashboard/profile`

**Done**
- Dashboard
- Tabs: Pending orders, Sample collection, Result entry, Report release
- Messages (role route)

**Remaining**
- **View all reports:** “View all reports feature coming soon”
- **Profile/Settings:** “Profile coming soon” in sidebar

---

## 6. Pharmacist Dashboard

**Routes:** `/dashboard/pharmacist`, `/pharmacist/messages`, `/dashboard/profile`

**Done**
- Dashboard, prescriptions list
- Tabs: Inventory, Dispensing, Purchase orders, Suppliers, Stock movements
- Messages (role route)

**Remaining**
- **Low stock alerts:** Dashboard KPI still 0; connect to inventory API
- **Patient counseling:** “Patient counseling feature coming soon”
- **Stock alerts:** “Stock alerts feature coming soon”
- **Dispense CTA:** One “Dispense feature coming soon” (may overlap with Dispensing tab)
- **Profile/Settings:** “Profile coming soon” in sidebar

---

## 7. Radiology Technician Dashboard

**Routes:** `/dashboard/radiology-technician`, `/radiology-technician/messages`, `/dashboard/profile`

**Done**
- Dashboard
- Tabs: Pending orders, Report creation, Report release (UI)
- Messages (role route)

**Remaining**
- **Reports API:** Backend alignment (e.g. `/api/radiology-workflow/reports`) and proper release flow
- **Start imaging / Perform imaging:** “Coming soon”
- **Imaging procedure, Image upload, Equipment, Scheduling:** Quick actions “coming soon”
- **Profile/Settings:** “Profile coming soon” in sidebar

---

## 8. Nurse Dashboard

**Routes:** `/dashboard/nurse`, `/nurse/messages`, `/dashboard/profile`

**Done**
- Dashboard, IPD encounters (assigned)
- IPD list, assign nurse
- Messages (role route)

**Remaining**
- **eMAR:** Link “Medication administration” from dashboard to eMAR page (`emar.tsx`)
- **Nursing notes:** “Nursing notes feature coming soon”
- **Medication administration:** Link to eMAR and clarify flow
- **Shift handover:** “Shift handover feature coming soon”
- **Profile/Settings:** “Profile coming soon” in sidebar

---

## Cross-cutting

**Done**
- Role-based messages routes: `/patient/messages`, `/receptionist/messages`, `/admin/messages`, `/doctor/messages`, etc.; `/messages` redirects by role
- Sidebar on Messages page for Hospital Admin (HospitalSidebar)
- Notification sounds: `playNotificationSound` import fix; AudioContext resume on first user interaction
- Profile: `bodyStyle` → `styles.body` on Messages Card; nullish coalescing fix for Email display
- Contact directory: search by mobile/name/patient ID (backend no longer uses mobile as integer for `patients.id`)
- Receptionist/Hospital: past appointments by date (date picker) on dashboard and on `/receptionist/appointments`
- Family member: acting patient ID/name in header (TopHeader) when switched; profile shows correct display user

**To verify / polish**
- Message notification sounds: ensure sounds play after first user interaction in all environments
- Unread message count badge on Messages icon (if not already shown)
- Drizzle/DB: ensure `messages` table exists and migrations are run in each environment

Use this file to pick the next slice of work per role (e.g. “Hospital: add `/admin/appointments`” or “Patient: Lab reports page”) and to track “coming soon” vs implemented.
