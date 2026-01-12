# NexaCare — Feature Gap Matrix (Full HMS vs Current) + Roadmap

> **How to read**: “Full HMS expectation” = what mature hospital systems commonly offer. “NexaCare status” = what exists in this codebase today.

---

## 1) Core Modules Matrix

### 1.1 Patient Portal & Engagement
- **Online discovery + booking**: **Implemented**
- **Reschedule / waitlist**: **Missing**
- **Patient intake forms & consents**: **Mostly missing**
- **Patient payments & invoices**: **Missing**
- **Patient health record timeline (longitudinal)**: **Partial**
- **Notifications (SMS/WhatsApp/email)**: **Partial** (in-app + sound; messaging integrations missing)

### 1.2 OPD Front Desk (Reception)
- **Walk-in registration**: **Implemented**
- **Token/queue management**: **Missing**
- **OPD billing**: **Missing**
- **Patient search + quick registration**: **Partial**
- **Doctor schedule overrides / leave**: **Missing**

### 1.3 Doctor EMR / Clinical
- **Appointments + basic workflow**: **Implemented**
- **Prescriptions**: **Implemented**
- **Clinical notes (SOAP), ICD coding**: **Missing**
- **CPOE orders (labs/radiology/pharmacy/nursing)**: **Missing**
- **Clinical decision support**: **Missing**

### 1.4 Diagnostics
- **Lab reports upload/view**: **Partial**
- **Lab order lifecycle (LIS)**: **Missing**
- **Radiology ordering + reporting (RIS)**: **Missing**
- **PACS/DICOM viewer**: **Missing**

### 1.5 IPD / ADT (Inpatient)
- **Admission**: **Missing**
- **Bed/ward management**: **Missing**
- **Transfers (ward/ICU)**: **Missing**
- **Discharge workflows**: **Missing**
- **Nursing station + eMAR**: **Missing**

### 1.6 Pharmacy
- **Inventory (batch/expiry)**: **Missing**
- **Dispensing (OPD/IPD)**: **Missing**
- **Integration to billing**: **Missing**

### 1.7 Billing & Insurance/TPA
- **Tariffs / price lists**: **Missing**
- **Packages**: **Missing**
- **Deposits**: **Missing**
- **Final settlement**: **Missing**
- **Insurance pre-auth/claims**: **Missing**

### 1.8 Admin / Reporting / Compliance
- **Role dashboards**: **Implemented (varies by role)**
- **Audit logs**: **Missing**
- **Reports (census, revenue, TAT)**: **Partial**
- **Multi-facility / tenant configuration**: **Unknown/partial**

---

## 2) Recommended Roadmap (Practical Sequence)

### Phase A — Harden OPD (2–4 weeks)
- Reschedule + cancel policies
- Token/queue management for reception + doctor
- Strong patient search/registration at reception
- Basic billing for OPD (invoice/receipt)
- SMS/WhatsApp reminders integration

### Phase B — Start IPD Foundation (4–8 weeks)
- ADT: admission + discharge + transfers
- Ward/room/bed master + occupancy engine
- Inpatient encounter model (orders, daily charges, notes placeholders)
- Simple discharge summary builder

### Phase C — Billing Engine (6–12 weeks, overlaps Phase B)
- Tariffs per service + room category
- Deposits + settlement
- Package support (basic)
- Insurance/TPA v1 (pre-auth + approval tracking)

### Phase D — Nursing + eMAR (8–16 weeks)
- Vitals charts + nursing notes
- Medication schedules and administration logging
- Alerts for missed meds, vitals thresholds

### Phase E — Diagnostics + Pharmacy deepening (ongoing)
- Lab order lifecycle (sample tracking)
- Radiology ordering/reporting
- Pharmacy inventory & dispensing
- Integrations (HL7/FHIR/DICOM) for enterprise hospitals

---

## 3) What You Should Decide (so we can finalize specs)
Answer these and I can turn this matrix into an executable PRD + backlog:
- **Hospital size target**: clinic, 30-bed, 100-bed, multi-specialty?
- **Country/regulatory**: India-only? (GST, ABHA/NDHM, etc.)
- **Revenue model**: SaaS per facility / per doctor / per patient / transaction?
- **Must-have departments for v1**: ER? OT? ICU? Pharmacy? Billing+TPA?
- **Integrations**: WhatsApp, SMS gateway, payment gateway, printers, PACS?










