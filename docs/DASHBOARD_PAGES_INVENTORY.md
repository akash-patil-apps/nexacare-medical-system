# Dashboard Pages Inventory

This document lists all pages for each dashboard role and their current status.

## Patient Dashboard
- ✅ `/dashboard/patient` - PatientDashboard (Updated with new design)
- ⚠️ `/dashboard/patient/appointments` - PatientAppointments (Needs sidebar + TopHeader)
- ⚠️ `/dashboard/patient/prescriptions` - PatientPrescriptions (Needs sidebar + TopHeader)

## Doctor Dashboard
- ⚠️ `/dashboard/doctor` - DoctorDashboard (Needs sidebar update to 80px)
- ⚠️ `/dashboard/doctor/appointments` - DoctorAppointments (Needs sidebar + TopHeader)
- ⚠️ `/dashboard/doctor/prescriptions` - DoctorPrescriptions (Needs sidebar + TopHeader)

## Hospital Dashboard
- ⚠️ `/dashboard/hospital` - HospitalDashboard (Needs sidebar update to 80px)
- ⚠️ `/dashboard/hospital/revenue` - RevenueDetails (Needs sidebar + TopHeader)

## Receptionist Dashboard
- ⚠️ `/dashboard/receptionist` - ReceptionistDashboard (Needs sidebar update to 80px)

## Lab Dashboard
- ⚠️ `/dashboard/lab` - LabDashboard (Needs sidebar update to 80px)
- ⚠️ Lab sub-pages (rendered within dashboard):
  - Pending Orders
  - Result Entry
  - Report Release
  - Lab Reports
  - Upload Report
  - Analytics

## Pharmacist Dashboard
- ⚠️ `/dashboard/pharmacist` - PharmacistDashboard (Needs sidebar update to 80px)
- ⚠️ Pharmacy sub-pages (rendered within dashboard):
  - Prescriptions
  - Inventory
  - Reports

## Nurse Dashboard
- ⚠️ `/dashboard/nurse` - NurseDashboard (Needs sidebar update to 80px)

## Radiology Technician Dashboard
- ⚠️ `/dashboard/radiology-technician` - RadiologyTechnicianDashboard (Needs sidebar update to 80px)
- ⚠️ Radiology sub-pages (rendered within dashboard):
  - Pending Orders
  - Report Creation
  - Report Release

## Update Checklist

### Phase 1: Sidebar Updates (All Dashboards)
- [x] PatientSidebar - ✅ Already updated
- [x] ReceptionistSidebar - ✅ Updated
- [x] LabTechnicianSidebar - ✅ Updated
- [x] NurseSidebar - ✅ Updated
- [x] PharmacistSidebar - ✅ Updated
- [ ] Doctor SidebarContent - Needs conversion to narrow design
- [ ] Hospital SidebarContent - Needs conversion to narrow design
- [ ] Radiology Technician Sidebar - Check if exists

### Phase 2: Dashboard Width Updates
- [ ] Update all `siderWidth` to `80` (currently 260)
- [ ] Update all `Sider` `width` props to `80`
- [ ] Update drawer widths to `260` (for mobile)

### Phase 3: Sub-Pages Updates
All sub-pages need:
1. Sidebar component (always visible)
2. TopHeader component
3. Proper layout with marginLeft: 80px
4. Responsive padding (12px 16px 20px for desktop)
