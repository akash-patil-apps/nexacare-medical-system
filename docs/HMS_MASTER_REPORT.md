# NexaCare — HMS Master Report (OPD → IPD → Discharge) + What “IPD” Means

> **Goal of this document**: Define IPD clearly, then describe—in operational detail—what a “complete” Hospital Management System (HMS/HIS) typically supports, from **online appointment** to **final discharge**, across departments and scenarios.

---

## 1) What is IPD in Hospital Management?

**IPD = In‑Patient Department (or In‑Patient Division).**

If **OPD** is “patient comes, consults, and leaves the same day,” **IPD** is “patient is *admitted* and occupies a bed/room and receives ongoing care over multiple shifts/days.”

### 1.1 Core IPD Concepts (the backbone)
- **ADT**: Admission / Discharge / Transfer
  - **Admission**: create an inpatient encounter + allocate bed + start inpatient billing & clinical charting.
  - **Transfer**: move patient between beds/wards/units (e.g., ER → ICU → Ward).
  - **Discharge**: end the inpatient encounter, clear bed, finalize documents + billing.
- **Bed/Ward/Room Management**
  - Ward → Room → Bed hierarchy; occupancy status; cleaning/turnaround; bed blocking.
- **Inpatient Encounter / Episode of Care**
  - A single admission period with clinical orders, nursing charting, investigations, medication administration, procedures, and billing lines.
- **Orders & Order Fulfillment**
  - Doctor places orders (labs/radiology/medications/nursing/procedures).
  - Departments fulfill them (sample collected → result; medication dispensed → administered).
- **MAR / eMAR**: Medication Administration Record
  - Nursing administers meds per schedule; track dose/time/route; missed/held/refused reasons.
- **Clinical Documentation**
  - Admission notes, daily progress notes, vitals, nursing notes, intake-output, pain scale, consult notes, OT notes, discharge summary.
- **IP Billing**
  - Room rent, nursing charges, procedure packages, consumables, pharmacy issues, investigations, deposits, insurance/TPA approvals, final settlement.

### 1.2 How IPD differs from OPD (quick)
- **OPD**: appointment → consultation → prescription/lab request → payment → exit.
- **IPD**: admission → bed allocation → continuous care → multiple orders & administrations → procedures/OT → discharge + settlement.

---

## 2) “Complete HMS” — Major Modules & What They Offer

Think of HMS as **Clinical + Operations + Revenue + Compliance + Integrations**.

### 2.1 Patient-facing (Pre‑visit)
- **Online discovery**: hospital/doctor profiles, services, fees, timings, availability.
- **Appointment booking**: OPD, teleconsult, follow-ups, reschedule/cancel, reminders.
- **Pre‑visit intake**: demographics, insurance, symptoms, attachments, consent.
- **Payments**: booking fee/advance/deposit; receipts; refunds.
- **Patient portal**: prescriptions, lab reports, visit history, invoices, discharge summaries.

### 2.2 Front office / Reception / OPD desk
- **Registration** (MRN/Patient ID), demographics verification, KYC (if required).
- **Appointment management**: confirm, reschedule, walk‑in, queue/token.
- **Billing front desk**: OPD billing, advance collection, refunds, discount approvals.
- **Eligibility/insurance checks** (if integrated).

### 2.3 Doctor / Clinical
- **EMR**: SOAP notes, vitals, diagnosis (ICD), procedures (CPT), allergies, problems.
- **CPOE**: orders for labs/radiology/pharmacy/nursing/procedures.
- **Prescriptions**: eRx, dosage instructions, refills, interaction checks (advanced).
- **Follow‑up planning**: revisit schedule, care plans.

### 2.4 Nursing / IPD ward
- Shift handover, nursing notes, vitals charts, intake-output, care plan tasks.
- eMAR, medication schedules, PRN meds, controlled substances logs (advanced).
- Bedside procedures documentation, incident reporting.

### 2.5 IPD / Admission desk (ADT)
- **Admission types**: elective, emergency, day care, observation.
- **Bed allocation**: ward/room/bed, category, tariff mapping.
- **Transfer**: inter-ward/unit; upgrade/downgrade; isolation.
- **Discharge**: discharge order, summary, clearance workflow, bed release.

### 2.6 OT / Procedure scheduling
- OT calendar, surgeon/anesthetist assignments, equipment, consumables.
- Pre‑op checklist, consent forms, anesthesia notes, implant tracking.

### 2.7 Diagnostics: Laboratory (LIS) + Radiology (RIS/PACS)
- **Order** → **Sample/Study** → **Processing** → **Result/Report** → **Sign‑off**
- Critical value alerts, turnaround time monitoring, QC.
- HL7/FHIR/DICOM integrations (enterprise).

### 2.8 Pharmacy
- Inventory: batches, expiry, purchase, GRN, stock transfer, near‑expiry alerts.
- Dispense: OPD, IP issues, returns, substitutions, controlled drugs.
- Billing linkage: pharmacy issues to IP bill / OP invoice.

### 2.9 Billing / Finance / Revenue cycle
- Tariffs, packages, discounts, approvals, deposits, settlement.
- Insurance/TPA: pre‑auth, queries, approvals, claims, denials.
- Ledger, day book, cash/bank reconciliation, GST (region-specific).

### 2.10 Admin / HR / Ops
- Users/roles/permissions, audit logs.
- Staff roster, attendance (optional), asset management.
- Reports: census, revenue, doctor productivity, TAT, no‑shows, bed occupancy.

---

## 3) End-to-End Patient Journey (Minute-detail Flow)

Below is a “typical hospital” journey with all major decision points.

### 3.1 Online OPD Appointment (Patient)
1. **Discover** hospital/doctor → view fee, specialty, availability, reviews (optional).
2. **Select slot** (date/time) → validate against doctor schedule + holidays + capacity.
3. **Enter reason** + optional attachments (prior reports).
4. **Payment** (optional): booking fee/advance.
5. **Confirm booking**:
   - Generate **Appointment ID**
   - Send **SMS/WhatsApp/Email** confirmation
   - Create reminders (T‑24h, T‑2h, T‑15m).
6. **Pre‑visit intake** (optional): demographics, insurance, consent forms.

### 3.2 OPD Arrival & Front Desk
1. **Patient identification**: MRN lookup via phone/name/ID.
2. **Check‑in**: mark “arrived”, assign **token/queue number** (department-wise).
3. **Co‑pay** (optional): generate invoice/receipt.
4. **Vitals** (optional, nurse station): record vitals before doctor.

### 3.3 Doctor Consultation (OPD)
1. Open patient chart: history, allergies, meds, previous encounters.
2. Clinical note: complaints, exam, diagnosis, plan.
3. Create outputs:
   - **Prescription** (meds + instructions)
   - **Lab/Radiology orders**
   - **Procedure referral** (e.g., physiotherapy)
   - **Follow‑up** appointment scheduling
   - **Admission advice** (if needed) → triggers IPD admission workflow

### 3.4 If Patient Requires Admission (IPD Admission)
**Admission can start from OPD advice or directly from ER.**

1. Admission desk chooses:
   - Admission type: elective / emergency / day-care / observation
   - Specialty/service line
   - Consultant/attending doctor
2. Capture mandatory info:
   - Patient demographics, next of kin, address, emergency contact
   - Insurance/payer category (cash/TPA/corporate)
   - Consent acknowledgements
3. **Bed selection**:
   - Ward/category (General/Semi/Private/ICU)
   - Bed allocation rules: gender segregation, isolation, equipment needs
4. **Deposit/authorization**:
   - Cash deposit OR insurance pre‑auth initiation
5. Create Inpatient encounter:
   - **Admission No.**
   - **Ward/Bed**
   - Start IP tariffs/room rent
6. Notify ward: patient inbound.

### 3.5 Inpatient Stay (Daily Loop)
1. **Doctor orders**:
   - Labs, radiology, medications, IV fluids, diet, nursing tasks, procedures.
2. **Nursing**:
   - Vitals charting frequency, intake-output, nursing assessments.
   - eMAR: administer meds; document PRN use; adverse event recording.
3. **Diagnostics**:
   - Lab: collect → process → result → critical alerts → sign-off.
   - Radiology: schedule → perform → report → sign-off.
4. **Pharmacy**:
   - Validate orders, dispense, track issues/returns, update inventory.
5. **Billing**:
   - Auto-post room rent daily.
   - Post consumables/procedures/services.
   - Track package limits; raise insurance enhancements if needed.
6. **Transfers**:
   - ICU ↔ ward based on condition; bed release and new bed allocation.

### 3.6 OT / Procedure (If Applicable)
1. OT request → pre‑op assessment → anesthesia clearance.
2. Schedule: surgeon, OT room, equipment, implants.
3. Intra‑op documentation: anesthesia chart, surgical notes, implant traceability.
4. Post‑op: recovery, ICU/ward transfer, postop orders.

### 3.7 Discharge Workflow (IPD)
1. **Discharge order** by doctor (planned/transfer-out/death/LAMA).
2. **Clinical documentation**:
   - Discharge summary: diagnosis, course, procedures, final meds, follow-up, red flags.
   - Nursing discharge note; vitals at discharge.
3. **Department clearances** (optional, depending on hospital):
   - Pharmacy return/indent close
   - Lab/radiology pending items closed/handed over
   - Asset returns (oxygen cylinder, equipment)
4. **Billing finalization**:
   - Consolidate charges, package adjustments, discounts approvals.
   - Insurance: final bill submission, query resolution, approval.
5. **Settlement**:
   - Collect balance/refund excess deposit.
   - Generate invoice/receipt, discharge card.
6. **Bed release**:
   - Mark bed vacant → housekeeping/cleaning → ready.
7. **Post‑discharge follow-up**:
   - OPD follow-up appointment + reminders.
   - Patient portal updated with discharge docs + bill.

---

## 4) Department-wise Workflows (What “complete HMS” supports)

### 4.1 Emergency / Casualty (ER)
- **Triage**: ESI/priority, vitals, chief complaint.
- **ER encounter**: orders, procedures, meds, observation.
- **Disposition**:
  - Discharge from ER (OPD-like)
  - Admit to IPD/ICU
  - Transfer to other facility (referral)
  - Death certification workflow (if applicable)

### 4.2 OPD Clinics
- Specialty scheduling, follow-ups, chronic care programs.
- Clinic templates (e.g., Diabetes clinic: HbA1c reminders).

### 4.3 IPD Wards / ICU
- Nurse station dashboard, rounding lists, escalation alerts.
- Ventilator charts (ICU), critical care protocols (advanced).

### 4.4 Laboratory (LIS)
- Sample lifecycle: collected → received → processing → validated → released.
- Critical alert protocol; delta checks; QC (advanced).

### 4.5 Radiology (RIS/PACS)
- Modality scheduling, technician workflow, radiologist sign-off.
- DICOM storage/viewer integration (enterprise).

### 4.6 Pharmacy
- Formulary, substitutions, interaction alerts (advanced).
- Inventory with batch/expiry, purchase orders, vendor management.

### 4.7 Billing & Insurance/TPA
- Tariffs: OPD/IPD, room category linked tariffs.
- Insurance:
  - Pre-auth initiation, enhancement, queries, approvals.
  - Claim submission, denial handling, audit trail.

### 4.8 OT / CSSD / Biomedical (common in larger hospitals)
- Sterile instruments tracking, tray sets, sterilization cycles (CSSD).
- Equipment maintenance schedules, calibration, downtime logs.

### 4.9 Blood Bank (if applicable)
- Cross-match, issue/return, donor management, transfusion reactions.

### 4.10 Diet & Housekeeping
- Diet orders by ward; kitchen production list; diet changes.
- Housekeeping: bed cleaning workflow, linen tracking (optional).

---

## 5) Scenarios & Edge Cases a Mature HMS Handles

### 5.1 Appointment scenarios (OPD)
- No-show + reschedule policy
- Doctor leaves early / emergency → bulk reschedule + patient notifications
- Walk-in with token queue
- Follow-up discount windows (e.g., within 7 days)

### 5.2 Admission scenarios (IPD)
- Elective admission from OPD
- Emergency admission via ER
- Day-care admission (admit + discharge same day)
- Observation (short stay) and convert-to-admission
- Transfer-out/referral to another hospital
- Upgrade/downgrade room category (billing implications)

### 5.3 Discharge scenarios
- Planned discharge
- LAMA/DAMA (Leave/Discharge Against Medical Advice)
- Absconded patient
- Death case workflow (certificates, medico-legal)

### 5.4 Insurance scenarios
- Pre-auth pending but life-saving treatment begins
- Enhancement required mid-stay
- Partial approval and patient co-pay
- Denial and conversion to cash

### 5.5 Safety & compliance scenarios
- Consent capture (procedure, anesthesia, blood transfusion)
- Audit trails for clinical edits
- Role-based access (nurse vs doctor vs billing)

---

## 6) Market Landscape (Reality Check)

It’s not feasible to “analyze every HMS in the world” exhaustively in one document, but the market clusters into patterns:

### 6.1 Common product categories
- **HIS/HMS suites (enterprise)**: deep IPD/OT/billing, compliance, integrations.
- **Clinic/OPD systems**: scheduling + EMR-lite + basic billing.
- **Patient marketplaces**: discovery + booking (often not hospital ops).
- **Department systems**: LIS/RIS/PACS/Pharmacy standalone.

### 6.2 What the best-in-class typically includes (baseline expectations)
- ADT + bed management + nurse charting + CPOE + billing + insurance + pharmacy + LIS/RIS integrations + audit logs + reporting.

> Your repo already has `docs/COMPETITIVE_ANALYSIS.md` for named competitors; this doc focuses on workflows/modules so you can benchmark any vendor against the same checklist.

---

## 7) How We Should Use This Document for NexaCare
- Treat this as the **target operating model**.
- Maintain a parallel **“Current Status Snapshot”** + **Gap Matrix** (created separately) so every feature request maps to:
  - Which module
  - Which workflow step
  - Which role owns it
  - Data required
  - API + UI changes needed


