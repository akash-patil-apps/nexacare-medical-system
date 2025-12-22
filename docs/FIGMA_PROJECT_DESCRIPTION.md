# NexaCare Medical System - Project Description for Figma AI

**Purpose**: Copy-paste this description into Figma Make AI to get context about the project

---

## 🎯 **Quick Project Description (For Figma Make Input Field)**

```
NexaCare Medical System is a comprehensive full-stack healthcare management platform serving hospitals, doctors, patients, lab technicians, and receptionists. It's a multi-role system with appointment booking, digital prescriptions, lab report management, and hospital operations management. The platform needs modern, professional medical UI designs for 21 pages including authentication, onboarding, role-based dashboards, and feature pages. Design should be responsive (desktop 1440px and mobile 375px), use a medical color palette (role-specific blues and purples), Inter typography, 8px spacing grid, and follow Ant Design component patterns. Target users are healthcare professionals and patients in India, requiring clean, accessible, and mobile-first designs.
```

---

## 📋 **Detailed Project Description (For Context)**

### **Project Overview**

**NexaCare Medical System** is a comprehensive healthcare management platform designed to streamline operations for multiple stakeholders in the healthcare ecosystem. Unlike simple appointment booking apps, NexaCare provides complete hospital operations management with multi-role workflows.

### **Target Users**

1. **Patients** - Book appointments, view prescriptions, access lab reports, manage medical records
2. **Doctors** - Manage appointments, create prescriptions, view patient history, track schedule
3. **Hospital Administrators** - Manage staff, departments, analytics, operations
4. **Lab Technicians** - Process samples, upload reports, manage test queue
5. **Receptionists** - Confirm appointments, check-in patients, manage queues

### **Core Features**

- **Multi-Role Appointment Workflow**: Patient books → Receptionist confirms → Doctor completes
- **Digital Prescription Management**: Create, view, and manage prescriptions with medication details
- **Lab Report System**: Upload, view, and manage diagnostic reports
- **Hospital Operations**: Staff management, analytics, department coordination
- **Real-Time Updates**: Cross-role synchronization and notifications
- **Role-Based Dashboards**: Customized interfaces for each user type

### **Design Requirements**

#### **Visual Style**
- **Aesthetic**: Modern, professional medical platform
- **Inspiration**: Practo, Zocdoc, Doctolib (clean healthcare UI)
- **Tone**: Trustworthy, efficient, accessible
- **Feel**: Enterprise-grade but user-friendly

#### **Color System**
- **Patient Role**: Primary #1A8FE3 (Blue), Secondary #10B981 (Green), Background #F7FBFF
- **Doctor Role**: Primary #1D4ED8 (Blue), Secondary #7C3AED (Purple), Background #F5F7FF
- **Hospital Role**: Primary #7C3AED (Purple), Secondary #0EA5E9 (Cyan), Background #F6F2FF
- **Receptionist Role**: Primary #F97316 (Orange), Secondary #6366F1 (Indigo), Background #FFF7ED
- **Lab Role**: Primary #0EA5E9 (Cyan), Secondary #22C55E (Green), Background #F0FAFF

#### **Typography**
- **Font Family**: Inter (fallback: DM Sans, system sans-serif)
- **Weights**: 400 (body), 500 (labels), 600/700 (headings)
- **Scale**: 12px, 14px, 16px, 18px, 24px, 32px, 40px
- **Hierarchy**: Clear, readable, accessible

#### **Spacing System**
- **Base Grid**: 8px
- **Card Padding**: 16px (desktop), 12px (mobile)
- **Section Gaps**: 24px (desktop), 16px (mobile)
- **Component Spacing**: Consistent 8px multiples

#### **Components**
- **Cards**: 16px border radius, subtle shadows
- **Buttons**: 10px border radius, role-specific colors
- **Chips/Tags**: 12px border radius
- **Inputs**: 8px border radius, clear focus states
- **Icons**: Ant Design icon set, 18px (actions), 32px (empty states)

#### **Responsive Design**
- **Desktop**: 1440px width (primary breakpoint)
- **Tablet**: 768px - 1024px
- **Mobile**: 375px width (iPhone standard)
- **Approach**: Mobile-first, progressive enhancement

#### **Accessibility**
- **WCAG AA Compliance**: Minimum contrast ratios
- **Touch Targets**: Minimum 44px on mobile
- **Focus States**: Clear, visible focus indicators
- **Screen Readers**: Semantic HTML structure
- **Keyboard Navigation**: Full keyboard support

### **Pages to Design (21 Total)**

#### **Authentication (6 pages)**
1. Login - Password + OTP dual authentication
2. Register - Role selection
3. Patient Registration - Form with validation
4. Doctor Registration - Professional registration
5. Hospital Registration - Enterprise registration
6. OTP Verification - 6-digit code input

#### **Onboarding (2 pages)**
7. Patient Onboarding - Multi-step form (Personal → Medical → Emergency Contact)
8. Hospital Onboarding - Multi-step hospital setup

#### **Dashboards (5 pages)**
9. Patient Dashboard - KPIs, prescriptions, timeline, notifications
10. Doctor Dashboard - Schedule, prescriptions, patient queue
11. Hospital Admin Dashboard - Staff, analytics, operations
12. Lab Technician Dashboard - Sample pipeline, reports queue
13. Receptionist Dashboard - Appointment queue, check-ins

#### **Feature Pages (7 pages)**
14. Book Appointment - Multi-step flow (Hospital → Doctor → Date/Time → Confirm)
15. Patient Appointments - List view with filters
16. Doctor Appointments - Schedule view
17. Patient Prescriptions - Prescription cards with medications
18. Doctor Prescriptions - Prescription creation interface
19. Hospital Prescriptions - All prescriptions view
20. Lab Reports - Report upload and viewing
21. 404 Not Found - Error page

### **Key Design Patterns**

#### **Dashboard Layout**
- **Desktop**: Fixed sidebar (260px) + scrollable main content (max-width 1320px)
- **Mobile**: Drawer sidebar (260px width, slides in from left)
- **Header**: Minimal, breadcrumb + action buttons
- **Content**: KPI cards → Quick actions → Primary data → Secondary modules

#### **Form Design**
- **Layout**: Single column, clear labels
- **Validation**: Inline error messages below fields
- **States**: Default, focus, error, success, disabled
- **Mobile**: Full-width inputs, large touch targets

#### **Card Components**
- **KPI Cards**: Icon + value + label + trend indicator
- **Action Cards**: Icon + title + description + CTA
- **Data Cards**: Structured information with actions
- **Empty States**: Illustration + message + CTA

#### **Navigation**
- **Sidebar**: Role-specific navigation, profile at bottom
- **Breadcrumbs**: Clear page hierarchy
- **Tabs**: For filtering/segmenting content
- **Mobile**: Hamburger menu, drawer navigation

### **User Flows to Consider**

1. **Patient Journey**: Register → Onboard → Book Appointment → View Prescription → Check Lab Report
2. **Doctor Journey**: Login → View Schedule → Start Consultation → Create Prescription → Complete Appointment
3. **Receptionist Journey**: Login → View Queue → Confirm Appointment → Check-in Patient
4. **Hospital Admin**: Login → View Analytics → Manage Staff → Generate Reports

### **Technical Context**

- **Framework**: React 18 + TypeScript
- **UI Library**: Ant Design 5.27.4
- **Styling**: CSS-in-JS, responsive breakpoints
- **State Management**: React Query for data fetching
- **Routing**: Wouter for navigation

### **Design Inspiration**

- **Practo**: Clean appointment booking, doctor profiles
- **Zocdoc**: Professional healthcare UI, clear information hierarchy
- **Doctolib**: European healthcare platform, modern design
- **Modern SaaS Dashboards**: Data visualization, analytics
- **Medical Apps**: Trustworthy, accessible, professional

### **Success Criteria**

A successful design should:
- ✅ Be modern and professional (medical aesthetic)
- ✅ Have clear information hierarchy
- ✅ Work excellently on mobile (primary use case)
- ✅ Be accessible (WCAG AA compliant)
- ✅ Follow design system consistently
- ✅ Include all required states (loading, error, empty, success)
- ✅ Be production-ready (developer-friendly)

---

## 🎯 **One-Liner for Quick Reference**

```
Healthcare management platform with multi-role dashboards, appointment booking, prescriptions, and lab reports. Modern medical UI, responsive design, role-specific color palettes, Inter typography, 8px grid system, Ant Design components. 21 pages total: authentication, onboarding, dashboards, and feature pages.
```

---

## 📝 **For Figma Make: Start with This**

When you first open Figma Make, paste this in the input field:

```
Design a modern healthcare management platform called NexaCare Medical System. It's a multi-role system (patients, doctors, hospitals, labs, receptionists) with appointment booking, digital prescriptions, lab reports, and hospital operations. Need professional medical UI with role-specific color palettes (blues, purples), Inter typography, 8px spacing grid, responsive design (desktop 1440px, mobile 375px), Ant Design-inspired components. Design should be clean, accessible, mobile-first, and follow modern healthcare app aesthetics like Practo or Zocdoc. Starting with the login page - hospital background image with form overlay, dual authentication (password + OTP), modern medical aesthetic.
```

Then for each specific page, use the detailed prompts from `FIGMA_AI_PROMPTS.md`.

---

**Last Updated**: Wednesday, November 26, 2025 at 11:45 PM IST

