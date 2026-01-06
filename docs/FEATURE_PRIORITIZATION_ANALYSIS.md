# NexaCare - Feature Prioritization Analysis

**Created**: January 2025  
**Purpose**: Comprehensive analysis of documentation to identify what features/modules should be prioritized for development

---

## 📊 Executive Summary

Based on comprehensive review of all documentation, here are the **recommended priorities** for next development work:

### Current Status
- ✅ **95% Core OPD Features Complete**
- ✅ **Dashboard Redesign Complete** (all roles)
- ✅ **Foundation Solid** (Auth, Appointments, Prescriptions, Basic Lab)

### Critical Gaps
- ❌ **OPD Operations** (Queue/Token, Rescheduling, Billing)
- ❌ **IPD/ADT** (Admission, Bed Management, Discharge)
- ❌ **Revenue Cycle** (Billing, Payments, Invoices)
- ❌ **Clinical Documentation** (EMR Notes, CPOE Orders)

---

## 🎯 TIER 1: CRITICAL - Must Build Next (2-4 Weeks)

These features are **blocking real hospital operations** and should be prioritized immediately.

### 1.1 OPD Queue/Token Management ⭐⭐⭐
**Priority**: P0 (Blocks real hospital ops)  
**Effort**: Medium (2-3 days)  
**Impact**: Very High  
**Status**: PRD Complete, Ready to Implement

**Why Critical**:
- Real clinics run on token/queue systems
- Currently missing - receptionists can't manage patient flow
- Doctors need "Now Serving" visibility
- Patients expect token numbers

**What to Build**:
- Token assignment on check-in
- Queue management (reorder, skip, no-show)
- Doctor queue view ("Now Serving" + next patients)
- Real-time queue updates

**Reference**: `PRD_OPD_QUEUE_TOKEN.md` (complete spec)

**Files Needed**:
- New table: `opd_queue_entries`
- API routes: `/api/opd-queue/*`
- UI: Receptionist queue panel, Doctor queue widget

---

### 1.2 Appointment Rescheduling ⭐⭐⭐
**Priority**: P0 (Blocks real hospital ops)  
**Effort**: Medium (2-3 days)  
**Impact**: Very High  
**Status**: PRD Complete, Ready to Implement

**Why Critical**:
- Most common OPD operation (patient can't come, doctor unavailable)
- Currently missing - patients can only cancel
- Receptionists need bulk reschedule for doctor leave
- Essential for operational flexibility

**What to Build**:
- Patient reschedule request flow
- Receptionist direct reschedule
- Bulk reschedule (doctor unavailable)
- Reschedule history/audit trail

**Reference**: `PRD_APPOINTMENT_RESCHEDULING.md` (complete spec)

**Files Needed**:
- New table: `appointment_reschedules`
- API routes: `/api/appointments/:id/reschedule`
- UI: Reschedule modals in Patient + Receptionist dashboards

---

### 1.3 OPD Billing & Payments ⭐⭐⭐
**Priority**: P0 (Enables revenue cycle)  
**Effort**: Large (4-5 days)  
**Impact**: Very High  
**Status**: PRD Complete, Ready to Implement

**Why Critical**:
- No revenue tracking without billing
- Receptionists need invoice/receipt generation
- Patients need payment history
- Foundation for future IPD billing

**What to Build**:
- Invoice generation per appointment
- Payment recording (cash/card/UPI)
- Receipt PDF generation
- Discount approval workflow
- Refund handling

**Reference**: `PRD_OPD_BILLING_PAYMENTS_V1.md` (complete spec)

**Files Needed**:
- New tables: `invoices`, `invoice_items`, `payments`, `refunds`
- API routes: `/api/billing/opd/*`
- UI: Billing column in Receptionist dashboard, Invoice pages

---

### 1.4 Doctor Availability & Leave Management ⭐⭐
**Priority**: P0 (Enables rescheduling)  
**Effort**: Medium (2-3 days)  
**Impact**: High  
**Status**: PRD Complete, Ready to Implement

**Why Critical**:
- Needed for bulk reschedule workflow
- Blocks invalid bookings when doctor unavailable
- Essential for schedule management

**What to Build**:
- Weekly availability rules
- Leave/exception management
- Slot availability calculation
- Integration with booking system

**Reference**: `PRD_DOCTOR_AVAILABILITY_LEAVE.md` (complete spec)

**Files Needed**:
- New tables: `doctor_availability_rules`, `doctor_availability_exceptions`
- API routes: `/api/availability/*`
- UI: Availability page in Doctor dashboard

---

## 🚀 TIER 2: HIGH PRIORITY - Build After Tier 1 (4-8 Weeks)

These features make the system "real-life usable" and complete core workflows.

### 2.1 IPD/ADT + Bed Management ⭐⭐
**Priority**: P1 (Completes HMS foundation)  
**Effort**: Large (6-8 weeks)  
**Impact**: Very High  
**Status**: PRD Complete, Ready to Implement

**Why Important**:
- Transforms OPD-only system to full HMS
- Enables inpatient workflows
- Foundation for nursing station, IP billing

**What to Build**:
- Admission workflow (ADT)
- Ward/Room/Bed masters
- Bed allocation & transfers
- Discharge workflow
- IPD encounter management

**Reference**: `PRD_IPD_ADT_BED_MANAGEMENT_V1.md` (complete spec)

**Files Needed**:
- New tables: `wards`, `rooms`, `beds`, `ipd_encounters`, `bed_allocations`
- API routes: `/api/ipd/*`
- UI: Admission desk, Nurse station, Doctor IPD view

---

### 2.2 Clinical Documentation (EMR Notes) ⭐⭐
**Priority**: P1 (Completes clinical workflow)  
**Effort**: Medium (3-4 days)  
**Impact**: High  
**Status**: Partial (prescriptions exist, notes missing)

**Why Important**:
- Doctors need to document visits (SOAP notes)
- Foundation for CPOE orders
- Required for discharge summaries

**What to Build**:
- Clinical notes form (SOAP format)
- Visit documentation
- Diagnosis coding (ICD) - basic
- Notes history per patient

**Reference**: `HMS_MASTER_REPORT.md` (section 2.3)

**Files Needed**:
- New table: `clinical_notes` or extend `appointments`
- API routes: `/api/clinical-notes/*`
- UI: Notes editor in Doctor dashboard

---

### 2.3 Lab Order Lifecycle (Complete LIS) ⭐⭐
**Priority**: P1 (Completes lab workflow)  
**Effort**: Medium (3-4 days)  
**Impact**: High  
**Status**: Partial (upload exists, lifecycle missing)

**Why Important**:
- Complete lab workflow (order → sample → result)
- Doctor needs to order tests
- Lab needs sample tracking
- Patient needs result visibility

**What to Build**:
- Doctor lab order interface
- Lab sample collection workflow
- Status tracking (ordered → collected → processing → ready)
- Result entry and validation
- Critical value alerts

**Reference**: `PRD_LAB_ORDERS_LIFECYCLE.md` (if exists), `HMS_MASTER_REPORT.md`

**Files Needed**:
- Extend `lab_reports` table with lifecycle fields
- API routes: `/api/labs/orders/*`
- UI: Lab order form (Doctor), Sample tracking (Lab)

---

### 2.4 Messaging & Notifications (SMS/WhatsApp) ⭐
**Priority**: P1 (Improves patient experience)  
**Effort**: Medium (2-3 days)  
**Impact**: High  
**Status**: PRD Exists, Partial Implementation

**Why Important**:
- Patient reminders (appointment, lab results)
- Operational notifications
- #1 communication channel in India (WhatsApp)

**What to Build**:
- Twilio SMS integration
- WhatsApp Business API integration
- Notification templates
- Automated reminders

**Reference**: `PRD_MESSAGING_NOTIFICATIONS.md` (if exists), `STRATEGIC_ROADMAP.md`

**Files Needed**:
- Update: `server/services/sms.service.ts`, `email.service.ts`
- Integration: Twilio, WhatsApp Business API
- UI: Notification preferences

---

## 📋 TIER 3: MEDIUM PRIORITY - Enhancements (8-12 Weeks)

These features add polish and advanced capabilities.

### 3.1 Nursing Station + eMAR ⭐
**Priority**: P2 (IPD enhancement)  
**Effort**: Large (6-8 weeks)  
**Impact**: High (for IPD)  
**Status**: PRD Complete

**What to Build**:
- Vitals charting
- Medication administration record (eMAR)
- Nursing notes
- Care plan tasks

**Reference**: `PRD_NURSING_STATION_EMAR_V1.md`

---

### 3.2 Pharmacy Inventory & Dispensing ⭐
**Priority**: P2 (Revenue + Operations)  
**Effort**: Large (6-8 weeks)  
**Impact**: High  
**Status**: PRD Complete

**What to Build**:
- Inventory management (batch/expiry)
- Dispensing workflow (OPD/IPD)
- Stock tracking
- Purchase orders

**Reference**: `PRD_PHARMACY_INVENTORY_DISPENSING_V1.md`

---

### 3.3 Advanced Analytics & Reporting ⭐
**Priority**: P2 (Business intelligence)  
**Effort**: Medium (3-4 days)  
**Impact**: Medium  
**Status**: Basic stats exist

**What to Build**:
- Revenue analytics charts
- Patient flow analytics
- Doctor performance metrics
- Export to PDF/Excel

**Reference**: `PRD_REPORTING_ANALYTICS.md` (if exists)

---

### 3.4 Audit Logs & RBAC Compliance ⭐
**Priority**: P2 (Compliance)  
**Effort**: Medium (3-4 days)  
**Impact**: Medium (required for enterprise)  
**Status**: PRD Complete

**What to Build**:
- Audit trail for all actions
- Role-based access controls
- Compliance reporting

**Reference**: `PRD_AUDIT_LOGS_RBAC_COMPLIANCE.md`

---

## 🔮 TIER 4: FUTURE - Long-term Roadmap (12+ Weeks)

### 4.1 Radiology RIS/PACS
**Reference**: `PRD_RADIOLOGY_RIS_PACS_OUTLINE.md`

### 4.2 Telemedicine (Video Consultations)
**Reference**: `STRATEGIC_ROADMAP.md` (Tier 1 competitive feature)

### 4.3 Mobile App (PWA + Native)
**Reference**: `STRATEGIC_ROADMAP.md` (Tier 1 competitive feature)

### 4.4 Insurance/TPA Integration
**Reference**: `STRATEGIC_ROADMAP.md`, `HMS_MASTER_REPORT.md`

---

## 📊 Recommended Development Sequence

### **Phase A: Harden OPD (Weeks 1-4)** 🎯 START HERE
**Goal**: Make OPD operations production-ready

1. **Week 1-2**: OPD Queue/Token Management
2. **Week 2-3**: Appointment Rescheduling
3. **Week 3-4**: OPD Billing & Payments
4. **Week 4**: Doctor Availability & Leave

**Why First**: 
- Blocks real hospital operations
- High impact, manageable effort
- PRDs are complete and ready
- Foundation for everything else

---

### **Phase B: Start IPD Foundation (Weeks 5-12)**
**Goal**: Enable inpatient workflows

1. **Week 5-8**: IPD/ADT + Bed Management
2. **Week 9-10**: Clinical Documentation (EMR Notes)
3. **Week 11-12**: Lab Order Lifecycle (Complete LIS)

**Why Second**:
- Transforms system from OPD-only to full HMS
- Large effort, but critical for hospital operations
- PRDs are complete

---

### **Phase C: Enhancements (Weeks 13-20)**
**Goal**: Add polish and advanced features

1. **Week 13-14**: Messaging & Notifications (SMS/WhatsApp)
2. **Week 15-20**: Nursing Station + eMAR
3. **Week 21-24**: Pharmacy Inventory & Dispensing

---

### **Phase D: Advanced Features (Weeks 25+)**
**Goal**: Competitive features and scale

1. Analytics & Reporting
2. Audit Logs & RBAC
3. Telemedicine
4. Mobile App
5. Insurance/TPA

---

## 🎯 Immediate Next Steps (This Week)

### **Option 1: Start with OPD Queue/Token** (Recommended)
**Why**: 
- Highest operational impact
- PRD is complete
- 2-3 days effort
- Unblocks receptionist workflow

**Tasks**:
1. Create `opd_queue_entries` table migration
2. Build queue API routes
3. Add queue UI to Receptionist dashboard
4. Add "Now Serving" widget to Doctor dashboard

---

### **Option 2: Start with Appointment Rescheduling**
**Why**:
- Most requested feature
- PRD is complete
- 2-3 days effort
- Improves patient experience

**Tasks**:
1. Create `appointment_reschedules` table
2. Build reschedule API routes
3. Add reschedule UI to Patient appointments
4. Add bulk reschedule to Receptionist dashboard

---

### **Option 3: Start with OPD Billing**
**Why**:
- Enables revenue tracking
- PRD is complete
- 4-5 days effort
- Foundation for future billing

**Tasks**:
1. Create billing tables (`invoices`, `payments`, etc.)
2. Build billing API routes
3. Add billing UI to Receptionist dashboard
4. Add invoice/receipt PDF generation

---

## 📈 Success Metrics

### **After Phase A (OPD Hardening)**:
- ✅ Receptionists can manage patient queues
- ✅ Patients can reschedule appointments
- ✅ Revenue is tracked and invoiced
- ✅ Doctors can manage availability

### **After Phase B (IPD Foundation)**:
- ✅ Hospitals can admit patients
- ✅ Bed management is operational
- ✅ Clinical documentation exists
- ✅ Lab workflow is complete

### **After Phase C (Enhancements)**:
- ✅ SMS/WhatsApp notifications working
- ✅ Nursing station is functional
- ✅ Pharmacy is integrated

---

## 🔍 Key Insights from Documentation Review

### **What's Already Strong**:
- ✅ Core OPD appointment workflow
- ✅ Multi-role dashboards
- ✅ Prescription system
- ✅ Authentication & authorization
- ✅ Database foundation

### **What's Missing (Critical)**:
- ❌ Queue/token management
- ❌ Rescheduling
- ❌ Billing/payments
- ❌ IPD/ADT workflows
- ❌ Clinical documentation

### **What's Partial**:
- ⚠️ Lab workflow (upload exists, lifecycle missing)
- ⚠️ Notifications (in-app exists, SMS/WhatsApp missing)
- ⚠️ Analytics (basic stats exist, charts missing)

---

## 📚 Documentation References

### **Complete PRDs (Ready to Implement)**:
1. `PRD_OPD_QUEUE_TOKEN.md` - Queue/Token Management
2. `PRD_APPOINTMENT_RESCHEDULING.md` - Rescheduling
3. `PRD_OPD_BILLING_PAYMENTS_V1.md` - OPD Billing
4. `PRD_DOCTOR_AVAILABILITY_LEAVE.md` - Availability Management
5. `PRD_IPD_ADT_BED_MANAGEMENT_V1.md` - IPD/ADT
6. `PRD_NURSING_STATION_EMAR_V1.md` - Nursing Station
7. `PRD_PHARMACY_INVENTORY_DISPENSING_V1.md` - Pharmacy
8. `PRD_AUDIT_LOGS_RBAC_COMPLIANCE.md` - Audit Logs

### **Strategic Documents**:
- `STRATEGIC_ROADMAP.md` - Competitive features
- `HMS_MASTER_REPORT.md` - Complete HMS workflows
- `FEATURE_GAP_MATRIX.md` - Gap analysis
- `REMAINING_WORK.md` - Technical tasks
- `QA_GAP_REPORT.md` - Testing gaps

---

## ✅ Recommendation

**Start with Phase A: OPD Hardening**

**Week 1-2**: Implement **OPD Queue/Token Management**
- Highest operational impact
- PRD is complete
- Manageable effort (2-3 days)
- Unblocks receptionist workflow

**Then**: Appointment Rescheduling → OPD Billing → Doctor Availability

This sequence provides:
1. ✅ Immediate operational value
2. ✅ Foundation for future features
3. ✅ Manageable scope per sprint
4. ✅ Complete PRDs to guide implementation

---

**Last Updated**: January 2025  
**Next Review**: After Phase A completion




