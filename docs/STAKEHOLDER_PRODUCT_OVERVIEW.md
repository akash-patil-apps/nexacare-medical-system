# NexaCare Medical System  
## Product Overview for Stakeholders & Investment Discussion

**Document Purpose:** High-level product overview for client and investor discussions.  
**Audience:** Management, potential clients, investors.  
**Confidentiality:** Confidential — for authorized stakeholders only.  
**Version:** 1.0 | **Date:** February 2026  

---

## 1. Executive Summary

**NexaCare** is a healthcare management platform that connects hospitals, doctors, labs, pharmacy, and patients in one system. It supports **outpatient (OPD)** and **inpatient (IPD)** workflows with role-based dashboards, appointment booking, prescriptions, lab coordination, and notifications.

**Value proposition**
- **For hospitals:** One platform for appointments, queue, billing, IPD, and reporting.
- **For doctors:** Schedule, prescriptions, lab requests, and patient history in one place.
- **For patients:** Book visits, view prescriptions and lab reports, and get reminders.
- **For labs & pharmacy:** Integrated orders, results, and dispensing workflows.

**Current state:** Core OPD flow (book → confirm → check-in → consult → prescribe → invoice) is live, including online payment, appointment reschedule requests, and medicine reminders. IPD admission, bed management, clinical documentation, nurse eMAR, and pharmacy inventory are implemented. Doctor availability and leave management are in place. Lab and radiology workflows are in place. Roadmap covers telemedicine, multi-channel reminders, and analytics.

---

## 2. User Roles — Features at a Glance

The system supports **eight user roles**. Below is a summary of what each role can do today and what is planned (no technical or internal details).

---

### 2.1 Patient

| Area | Currently Available | Planned / Future |
|------|----------------------|------------------|
| **Appointments** | Book by hospital & doctor, choose date/time, pay online; view and manage appointments; request reschedule (receptionist approves) | Calendar view, recurring visits, reminders (SMS/WhatsApp) |
| **Prescriptions** | View prescriptions, see medications and instructions, download; request refill (pharmacy notified) | Refill reminders, link to pharmacy for delivery |
| **Lab reports** | View lab results linked to visits; get notified when results are ready | Direct lab test booking, historical trends |
| **Profile & family** | Profile, add family members, book “on behalf of” family | Family health summary, dependents management |
| **Communication** | In-app notifications (appointments, prescriptions, lab, refills, medicine reminders); messages | SMS/email/WhatsApp channels |
| **Records** | Document upload UI and care timeline (appointments, prescriptions, labs); persistent storage planned | Full digital health record, vaccination history |
| **Payments** | Checkout and payment for appointments (online payment flow; gateway configurable) | Payment history, insurance claims, receipts |

**Patient flow (current)**  
Register/Login → Onboard profile → Book appointment (hospital → doctor → slot → pay) → Receive confirmation → Arrive and get checked in (token) → Consult → Receive prescription & lab requests if any → View prescriptions & lab reports → Get notifications (e.g. results ready, refill, medicine reminders).

**Patient flow (future)**  
Same as above, plus: reminders before visit (SMS/WhatsApp), teleconsult option, pharmacy ordering, insurance verification, and a clearer health timeline.

---

### 2.2 Receptionist

| Area | Currently Available | Planned / Future |
|------|----------------------|------------------|
| **Appointments** | View pending/confirmed/checked-in; confirm; check-in (temp → real token); filter by today/tomorrow/date; approve/reject patient reschedule requests | No-show KPI count, overdue alerts, bulk actions |
| **Queue** | OPD queue with token display; late-arrival handling; mark patient as no-show | Real-time queue display, call-next-patient |
| **Pre-consult** | Record vitals before doctor; request lab test (with hospital as requester) | Triage checklist, pre-visit forms |
| **Billing** | Create invoice after check-in; link to payment | Payment tracking, pending payments KPI |
| **IPD** | View IPD tab; support admission and encounter list | Bed availability in one view, discharge workflow |
| **Lookup** | Contact directory (search by name, ID, mobile) | Quick patient history, visit history |
| **Communication** | In-app messages | SMS/email reminders, templates |

**Receptionist flow (current)**  
Login → See dashboard (today’s list, queue) → Confirm pending appointments (temp token) → Check in arriving patients (real token) → Optionally record vitals / request lab → After consult, create invoice → Use contact directory as needed.

**Receptionist flow (future)**  
Same, plus: no-show and pending-payment metrics, automated reminders, reschedule from queue, and clearer bed-status for IPD.

---

### 2.3 Doctor

| Area | Currently Available | Planned / Future |
|------|----------------------|------------------|
| **Schedule** | Today’s and upcoming appointments; patient, time, token, status; availability and leave (rules, exceptions, bulk reschedule for leave) | Recurring slots |
| **Consultation** | View patient, vitals, lab requests; create prescription (medications, dosage, frequency); request lab | Lab results widget, follow-up suggestions |
| **Prescriptions** | Create from appointment; patient gets notification; medicine reminders scheduled for patient | E-signatures, templates, drug interaction checks |
| **IPD** | View IPD patients; admit; assign bed; rounds/visits; clinical notes; transfer to another doctor | Full CPOE (orders), eMAR from orders, round templates |
| **History** | Patient context in appointment (vitals, labs) | Full history timeline, past prescriptions |
| **Communication** | In-app messages | Notifications for lab/patient updates, teleconsult link |

**Doctor flow (current)**  
Login → Dashboard (today/upcoming) → Select checked-in patient → See vitals/lab if done → Create prescription / request lab → For IPD: admit, assign bed, add rounds and notes, transfer if needed. Manage availability and leave (reception/booking use updated slots).

**Doctor flow (future)**  
Same, plus: lab results in dashboard, IPD orders (medications, investigations, diet), eMAR from orders, and teleconsult.

---

### 2.4 Hospital Administrator

| Area | Currently Available | Planned / Future |
|------|----------------------|------------------|
| **Overview** | KPIs (doctors, patients, appointments, revenue); tabs: Appointments, IPD, Reports, Audit | Dedicated appointments page, export revenue |
| **Appointments** | Today/upcoming and past by date | Full appointment list, filters, exports |
| **IPD** | Bed structure, occupancy, encounters list; view patient and clinical docs (read-only) | Discharge workflow, census reports |
| **Reports & audit** | OPD, lab, finance, IPD census; audit logs with export (e.g. CSV) | Custom reports, scheduled reports, compliance dashboards |
| **Revenue** | Revenue details view | Export (e.g. CSV/PDF), breakdown by department |
| **Staff** | Access to staff-related flows via dashboard | Staff roster, approvals, role management |
| **Communication** | In-app messages | Alerts, compliance notifications |

**Hospital admin flow (current)**  
Login → Dashboard (KPIs, tabs) → Review appointments by date → Review IPD (beds, encounters, patient docs) → View reports and audit logs → View revenue.

**Hospital admin flow (future)**  
Same, plus: dedicated appointments and doctor/patient/lab report pages, revenue export, and stronger reporting/compliance tools.

---

### 2.5 Lab Technician

| Area | Currently Available | Planned / Future |
|------|----------------------|------------------|
| **Orders** | Pending orders queue; see requester (e.g. hospital/doctor) | Priority sorting, filters |
| **Workflow** | Sample collection, result entry, report release; status updates | Sample tracking, device integration (e.g. HL7) |
| **Notifications** | Patient and doctor notified when report ready | Configurable alerts, critical value alerts |
| **Dashboard** | KPIs (samples pending, reports ready, alerts) | Quality control, turnaround metrics |

**Lab flow (current)**  
Login → Pending orders → Log sample / enter results → Release report → System notifies patient (and doctor when applicable).

**Lab flow (future)**  
Same, plus: full order lifecycle in UI, sample tracking, instrument integration, and billing linkage.

---

### 2.6 Nurse

| Area | Currently Available | Planned / Future |
|------|----------------------|------------------|
| **IPD list** | View assigned IPD patients; see encounter and bed | Shift handover, assignment rules |
| **Clinical** | Record vitals; clinical notes (where integrated); medication administration (eMAR — view due medications, record given/omitted) | Nursing care plans, eMAR driven by doctor orders (CPOE) |
| **Assignments** | Nurse assignment to patients | Workload view, task list |
| **Documentation** | Vitals and notes visible to doctors | Structured notes, templates |

**Nurse flow (current)**  
Login → IPD patient list → Select patient → Record vitals and document notes → Use eMAR to view due medications and record administration (given/omitted).

**Nurse flow (future)**  
Same, plus: eMAR fully driven by doctor orders (CPOE), nursing care plans, shift handover UI, and task list.

---

### 2.7 Pharmacist

| Area | Currently Available | Planned / Future |
|------|----------------------|------------------|
| **Prescriptions** | View prescriptions; dispensing workflow | Refill requests from patients, alerts |
| **Inventory** | Stock, items, movements | Low-stock alerts, reorder points |
| **Purchasing** | Purchase orders, suppliers | Approval workflow, GRN |
| **Dispensing** | Dispense against prescriptions; record | Patient counseling, batch tracking |

**Pharmacist flow (current)**  
Login → View prescription queue → Dispense and record → Manage inventory and purchase orders/suppliers.

**Pharmacist flow (future)**  
Same, plus: refill request handling, low-stock alerts, and stronger inventory and counseling features.

---

### 2.8 Radiology Technician

| Area | Currently Available | Planned / Future |
|------|----------------------|------------------|
| **Orders** | Pending imaging orders (e.g. X-Ray, CT, MRI) | Scheduling, equipment slot |
| **Reports** | Create and release radiology reports; link to order | RIS/PACS-style workflow, image upload |
| **Workflow** | Order → perform → report → release | Procedure documentation, quality checks |

**Radiology flow (current)**  
Login → Pending orders → Perform procedure (documentation as per current UI) → Create report → Release → Patient/doctor notified as designed.

**Radiology flow (future)**  
Same, plus: full order lifecycle, imaging procedure documentation, equipment and schedule views, and tighter integration with reporting.

---

## 3. End-to-End Flows (Current)

### 3.1 OPD — From booking to invoice

1. **Patient** registers, completes onboarding, and books an appointment (hospital → doctor → date → time slot → payment).
2. **Receptionist** sees pending appointment, confirms it (temporary token assigned); patient and doctor are notified.
3. **Patient** arrives; **receptionist** checks them in (real token), may record vitals and/or request lab tests.
4. **Doctor** sees checked-in patient, reviews vitals/lab requests, conducts consultation, creates prescription and/or lab requests.
5. **Patient** receives prescription notification; **receptionist** can create invoice after check-in/consultation.
6. **Lab** (if requested): technician processes order, enters result, releases report; **patient** (and doctor when applicable) gets notification.
7. **Patient** sees prescription and lab report in dashboard; can request refill; **pharmacist** can fulfill (when implemented in workflow).

### 3.2 IPD — Admission to documentation

1. **Receptionist/Hospital admin** initiates IPD admission (patient, doctor, bed).
2. **Doctor** sees IPD patient, can add rounds/visits and clinical notes; can transfer patient to another doctor.
3. **Nurse** sees assigned IPD patients, records vitals and nursing notes; documentation visible to doctors and admin.
4. **Hospital admin** can view IPD list, bed occupancy, and read-only clinical documentation and audit trail.

---

## 4. Planned Enhancements (Summary)

- **Patient:** Teleconsultation, SMS/email/WhatsApp reminders, pharmacy ordering, insurance verification, health timeline, document storage.
- **Receptionist:** No-show and pending-payment KPI counts, automated reminders, reschedule from queue.
- **Doctor:** Lab results in dashboard, IPD orders (CPOE), eMAR from orders, teleconsult.
- **Hospital:** Deeper reporting, revenue export, compliance tools.
- **Lab:** Full order lifecycle in UI, sample tracking, instrument integration.
- **Nurse:** eMAR driven by CPOE orders, care plans, shift handover UI.
- **Pharmacy:** Refill queue UI, low-stock alerts, inventory optimization.
- **Radiology:** Full order and procedure workflow, equipment and scheduling.
- **Platform:** Production payment gateway, multi-channel notifications (SMS/WhatsApp), analytics and reporting, security and compliance hardening.

*Detailed roadmap, timelines, and prioritization are internal and can be shared under NDA or partnership discussions.*

---

## 5. What This Document Does Not Include

To protect the product and intellectual property, this overview **does not include**:

- Technical architecture, stack, or infrastructure details  
- Database design, API specifications, or code  
- Internal credentials, test data, or environment details  
- File structure, repository layout, or deployment steps  
- Competitive strategy, financial projections, or pricing  
- Full PRDs, acceptance criteria, or implementation plans  

**Use:** This document is suitable for management to share with clients or investors to explain **what the system does and where it is headed**, without exposing how it is built or operated.
