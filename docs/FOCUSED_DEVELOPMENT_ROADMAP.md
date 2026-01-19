# NexaCare - Focused Development Roadmap
## Core Features Completion (No External Dependencies)

**Strategy**: Complete all core HMS features with mocked external services  
**Timeline**: 4-6 weeks  
**Goal**: 100% functional platform ready for external integrations later

---

## 🎯 **PRIORITY FEATURES TO COMPLETE**

### **1. Pharmacy Inventory Management** ❌ 0% → 100%
**Status**: Dashboard exists, no inventory system  
**Timeline**: 1-2 weeks

**Features Needed**:
- [ ] Stock management (add, update, delete)
- [ ] Batch/expiry tracking
- [ ] Low stock alerts
- [ ] Stock movement history
- [ ] Purchase orders
- [ ] Supplier management
- [ ] Dispensing workflow (OPD/IPD)
- [ ] Prescription fulfillment
- [ ] Stock reports

**Database Schema**:
- `pharmacy_inventory` (stock, batch, expiry)
- `pharmacy_stock_movements` (in/out transactions)
- `purchase_orders` (PO management)
- `suppliers` (supplier master)
- `dispensations` (dispensing records)

---

### **2. Lab (LIS) Complete Workflow** ⚠️ 50% → 100%
**Status**: Dashboard exists, missing workflow  
**Timeline**: 1 week

**Features Needed**:
- [ ] Lab order creation (from doctor/prescription)
- [ ] Sample collection tracking
- [ ] Test result entry interface
- [ ] Result validation workflow
- [ ] Report generation (mock PDF for now)
- [ ] Report release to patient
- [ ] Normal range validation
- [ ] Test status tracking (ordered → collected → processing → completed → released)
- [ ] Report history

**Database Schema**:
- `lab_orders` (enhance existing)
- `lab_samples` (sample collection)
- `lab_results` (test results)
- `lab_reports` (generated reports)

---

### **3. Radiology (RIS) Complete Workflow** ⚠️ 40% → 100%
**Status**: Dashboard exists, missing workflow  
**Timeline**: 1 week

**Features Needed**:
- [ ] Radiology order creation
- [ ] Appointment scheduling for imaging
- [ ] Modality assignment
- [ ] Image upload (mock for now, store metadata)
- [ ] Report generation interface
- [ ] Report approval workflow
- [ ] Report release to patient
- [ ] Study status tracking
- [ ] Modality scheduling

**Database Schema**:
- `radiology_orders` (enhance existing)
- `radiology_appointments` (imaging schedule)
- `radiology_images` (image metadata)
- `radiology_reports` (reports)

---

### **4. IPD Complete Workflow** ⚠️ 60% → 100%
**Status**: Admission/discharge exists, missing core workflow  
**Timeline**: 2 weeks

**Features Needed**:
- [ ] Complete bed/ward/room management
- [ ] IPD orders (CPOE):
  - Medication orders
  - IV fluid orders
  - Investigation orders (lab/radiology)
  - Diet orders
  - Nursing orders
- [ ] Doctor rounds/visits tracking
- [ ] Medication administration (eMAR)
- [ ] Discharge summary generation
- [ ] IPD billing (room charges, packages)
- [ ] Transfer workflows (ward/ICU)

**Database Schema**:
- `beds` (bed master)
- `wards` (ward master)
- `rooms` (room master)
- `ipd_orders` (all order types)
- `ipd_order_items` (order details)
- `doctor_rounds` (rounds tracking)
- `medication_administrations` (eMAR)
- `discharge_summaries` (discharge docs)

---

## 📋 **IMPLEMENTATION PLAN**

### **Week 1: Pharmacy Inventory**
- Day 1-2: Database schema & migrations
- Day 3-4: Backend services (inventory, stock movements)
- Day 5-6: Purchase orders & suppliers
- Day 7: Dispensing workflow

### **Week 2: Lab Workflow**
- Day 1-2: Lab order workflow (ordering → collection)
- Day 3-4: Result entry & validation
- Day 5: Report generation (mock)
- Day 6-7: Integration with doctor dashboard

### **Week 3: Radiology Workflow**
- Day 1-2: Radiology order workflow
- Day 3-4: Appointment scheduling & image metadata
- Day 5-6: Report generation
- Day 7: Integration

### **Week 4-5: IPD Complete Workflow**
- Day 1-3: Bed/ward/room management
- Day 4-7: IPD orders (CPOE)
- Day 8-10: Doctor rounds & eMAR
- Day 11-12: Discharge summary
- Day 13-14: IPD billing

### **Week 6: Testing & Polish**
- Integration testing
- Bug fixes
- UI/UX polish
- Documentation

---

## 🔧 **MOCKED SERVICES (Keep As-Is)**

### **SMS Service** ✅ Mocked
- Keep `server/services/sms.service.ts` as mock
- Returns success without actual SMS
- Can integrate Twilio later

### **Email Service** ✅ Mocked
- Keep `server/services/email.service.ts` as mock
- Returns success without actual email
- Can integrate SendGrid later

### **Payment Gateway** ✅ Mocked
- Keep current mock payment flow
- Returns success without actual payment
- Can integrate Razorpay later

### **File Storage** ✅ Mocked
- Store file metadata in database
- Return mock URLs
- Can integrate AWS S3 later

---

## 📊 **SUCCESS CRITERIA**

### **Pharmacy**
- ✅ Complete inventory management
- ✅ Stock tracking with batch/expiry
- ✅ Dispensing workflow functional
- ✅ Low stock alerts working

### **Lab**
- ✅ Complete order-to-report workflow
- ✅ Sample collection tracking
- ✅ Result entry interface
- ✅ Report generation (mock PDF)

### **Radiology**
- ✅ Complete order-to-report workflow
- ✅ Appointment scheduling
- ✅ Report generation interface
- ✅ Image metadata storage

### **IPD**
- ✅ Complete bed management
- ✅ All order types working
- ✅ Doctor rounds tracking
- ✅ eMAR functional
- ✅ Discharge summary generation

---

## 🎯 **FINAL GOAL**

**100% Functional HMS Platform** with:
- ✅ All core workflows complete
- ✅ All modules integrated
- ✅ Mocked external services
- ✅ Ready for external integrations when budget available

---

**Status**: Ready to start implementation  
**Next Step**: Begin with Pharmacy Inventory Management
