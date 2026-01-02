# Figma AI - Ready-to-Use Prompts for NexaCare Redesign

**Created**: Wednesday, November 26, 2025 at 11:45 PM IST  
**Purpose**: Copy-paste prompts for Figma AI/Make

---

## 🎨 **Design System Tokens**

```
COLORS:
Patient Role: Primary #1A8FE3, Secondary #10B981, Background #F7FBFF
Doctor Role: Primary #1D4ED8, Secondary #7C3AED, Background #F5F7FF
Hospital Role: Primary #7C3AED, Secondary #0EA5E9, Background #F6F2FF

TYPOGRAPHY:
Font: Inter (fallback: DM Sans)
Weights: 400 (body), 500 (labels), 600/700 (headings)

SPACING:
Grid: 8px base unit
Card padding: 16px (desktop), 12px (mobile)
Section gaps: 24px (desktop), 16px (mobile)

COMPONENTS:
Border radius: 16px (cards), 10px (buttons), 12px (chips)
Shadows: Subtle, medical aesthetic
```

---

## 📄 **1. LOGIN PAGE**

```
Redesign the NexaCare Medical System login page with:

CONTEXT:
- Healthcare platform login with dual authentication (Password + OTP)
- Hospital background image (full-screen, medical setting)
- Form overlay positioned on left 40% (desktop), full-width (mobile)
- Modern, professional medical aesthetic

REQUIREMENTS:
- Desktop: 1440px width, form on left overlay
- Mobile: 375px width, full-screen form
- Two login methods: Password login (default) + OTP login (tab)
- OTP flow: Enter mobile → Send OTP → Verify OTP → Login
- NexaCare branding (logo, tagline)
- Error handling with inline messages
- Loading states for API calls
- "Remember Me" checkbox
- "Forgot Password" link

DESIGN SYSTEM:
- Colors: Primary #1A8FE3 (Patient blue), white cards
- Typography: Inter, clean hierarchy
- Spacing: 8px grid, 24px gaps
- Buttons: 10px radius, filled primary color

INSPIRATION:
- Practo login (clean, medical)
- Modern SaaS login pages
- Healthcare app aesthetics

DELIVERABLES:
- Desktop layout (1440px)
- Mobile layout (375px)
- Password login view
- OTP login view
- Loading states
- Error states
```

---

## 📄 **2. REGISTER / ROLE SELECTION**

```
Redesign the NexaCare role selection page:

CONTEXT:
- First step of registration flow
- User chooses role: Patient, Doctor, Hospital Admin, Lab Technician, Receptionist
- Each role card should be visually distinct

REQUIREMENTS:
- Desktop: 1440px, 3-5 role cards in grid
- Mobile: 375px, stacked vertical cards
- Role cards with icon, title, description
- Hover effects (desktop)
- Clear CTAs: "Continue as [Role]"
- "Already have account? Login" link
- NexaCare branding

DESIGN:
- Role-specific color accents
- Medical icons for each role
- Card layout with subtle shadows
- Clear hierarchy and spacing

DELIVERABLES:
- Desktop view
- Mobile view
- Hover states
```

---

## 📄 **3. PATIENT REGISTRATION**

```
Redesign the Patient registration form:

CONTEXT:
- Multi-step registration for patients
- Collects: Mobile, Name, Email, Password, Date of Birth, Gender

REQUIREMENTS:
- Clean, accessible form layout
- Input validation states (error, success)
- Password strength indicator
- Date picker for DOB
- Gender selection (Male/Female/Other)
- "Continue" button → OTP verification
- Mobile-optimized inputs (min 44px touch targets)

DESIGN:
- Patient color scheme (#1A8FE3)
- Clear labels and helper text
- Error messages below inputs
- Progress indicator if multi-step

DELIVERABLES:
- Desktop form
- Mobile form
- Validation states
- Success state
```

---

## 📄 **4. OTP VERIFICATION**

```
Redesign the OTP verification page:

CONTEXT:
- Step after registration/phone number entry
- User enters 6-digit OTP sent to mobile
- Auto-advance between input fields

REQUIREMENTS:
- 6 individual input boxes for OTP digits
- Auto-focus next box on input
- "Resend OTP" button (with countdown timer)
- "Change mobile number" link
- Loading state during verification
- Success animation
- Error state (invalid OTP)

DESIGN:
- Large, touch-friendly inputs
- Clear instructions
- Visual feedback on each digit entry
- Countdown timer styling

DELIVERABLES:
- OTP input view
- Verification loading
- Success state
- Error state
- Resend timer state
```

---

## 📄 **5. PATIENT ONBOARDING (Multi-Step)**

```
Redesign the Patient onboarding flow:

CONTEXT:
- Multi-step form after registration
- Steps: Personal Info → Medical Info → Emergency Contact → Complete
- Progress indicator at top

REQUIREMENTS:
- Step indicator (4 steps)
- Form fields spread across steps
- "Back" and "Next" navigation
- Save progress capability
- Validation before proceeding
- Final step: Review & Submit

STEPS:
Step 1: Personal Info (Address, City, Pincode)
Step 2: Medical Info (Blood Group, Allergies, Medical History)
Step 3: Emergency Contact (Name, Relation, Phone)
Step 4: Review & Complete

DESIGN:
- Clear step progression
- Consistent form styling
- Mobile-friendly multi-step
- Success completion screen

DELIVERABLES:
- All 4 steps (desktop + mobile)
- Progress indicator
- Navigation states
- Completion screen
```

---

## 📄 **6. PATIENT DASHBOARD**

```
Redesign the Patient Dashboard:

CONTEXT:
- Main dashboard after login
- Displays: KPIs, Quick Actions, Prescriptions, Timeline, Notifications

REQUIREMENTS:
- Desktop: 1440px, sidebar + main content
- Mobile: 375px, drawer sidebar
- KPI Cards: Appointments, Prescriptions, Lab Reports, Notifications
- Quick Actions: Book Appointment, View Records, Download Reports
- Recent Prescriptions: Cards with medication details
- Care Timeline: Vertical timeline of medical events
- Next Appointment: Highlighted card
- Notifications Panel: Recent alerts

DESIGN:
- Patient color scheme (#1A8FE3)
- 4-column KPI grid (desktop), horizontal scroll (mobile)
- Clear information hierarchy
- Interactive cards with hover states
- Empty states for no data

DELIVERABLES:
- Desktop dashboard
- Mobile dashboard (with drawer)
- All component states
- Empty states
```

---

## 📄 **7. DOCTOR DASHBOARD**

```
Redesign the Doctor Dashboard:

CONTEXT:
- Doctor's main workspace
- Today's appointments, prescription tools, patient management

REQUIREMENTS:
- Desktop: Fixed sidebar + scrollable content
- KPI Cards: Today's Appointments, Pending Prescriptions, Lab Reviews, Follow-ups
- Today's Schedule: Table with appointment list
- Quick Actions: Start Consultation, Write Prescription, Add Notes
- Patient Queue: List of waiting patients
- Prescription Modal: Quick prescription creation

DESIGN:
- Doctor color scheme (#1D4ED8)
- Professional, productivity-focused
- Time-based appointment list
- Action buttons on each appointment

DELIVERABLES:
- Desktop dashboard
- Mobile dashboard
- Prescription modal
- All states
```

---

## 📄 **8. BOOK APPOINTMENT FLOW**

```
Redesign the Book Appointment multi-step flow:

CONTEXT:
- Patient books appointment: Hospital → Doctor → Date/Time → Confirm
- 4-step process with progress indicator

STEPS:
Step 1: Hospital Selection
- Search hospitals by name
- Filter by specialty, location
- Hospital cards with info, ratings
- Select hospital → Next

Step 2: Doctor Selection
- List doctors at selected hospital
- Show availability, specialties
- Doctor cards with photo, info
- Select doctor → Next

Step 3: Date/Time Selection
- Calendar view (today/tomorrow highlighted)
- Time slots grid
- Show available/unavailable slots
- Select date/time → Next

Step 4: Confirmation
- Review appointment details
- Add symptoms/complaints (optional)
- Confirm booking button
- Success message

REQUIREMENTS:
- Clear step progression
- Search and filter UI
- Card-based selection
- Calendar and time picker
- Mobile-optimized navigation
- Loading states between steps

DESIGN:
- Patient color scheme
- Large touch targets (mobile)
- Clear CTAs
- Professional booking experience

DELIVERABLES:
- All 4 steps (desktop + mobile)
- Search/filter UI
- Calendar component
- Time slot grid
- Confirmation screen
```

---

## 📄 **9. APPOINTMENTS LIST**

```
Redesign the Appointments list page (Patient view):

CONTEXT:
- Patient views all their appointments (past, upcoming)
- Can filter, search, and take actions

REQUIREMENTS:
- Tabs: Upcoming / Past / All
- Appointment cards with: Date, Time, Doctor, Hospital, Status
- Actions: View Details, Cancel, Reschedule
- Filters: By date, status, hospital
- Search: By doctor name, hospital
- Empty state: No appointments

DESIGN:
- Card-based layout
- Status badges (Confirmed, Pending, Completed, Cancelled)
- Clear date/time display
- Mobile: Stacked cards
- Desktop: Grid or list view

DELIVERABLES:
- List view (desktop + mobile)
- Filter/search UI
- Appointment cards
- Empty states
- Action states
```

---

## 📄 **10. PRESCRIPTION VIEW (Patient)**

```
Redesign the Patient prescription viewing page:

CONTEXT:
- Patient views their prescriptions
- Shows medication details, dosage, instructions

REQUIREMENTS:
- Prescription cards: Doctor, Date, Medications
- Expandable medication list
- Each medication: Name, Dosage, Frequency, Duration, Instructions
- Actions: Download PDF, Share via WhatsApp/Email
- Filter by date, doctor
- Search functionality

DESIGN:
- Clear medication information hierarchy
- Easy-to-read dosage instructions
- Print-friendly layout
- Mobile-optimized

DELIVERABLES:
- Prescription list
- Expanded prescription view
- Medication details
- Download/share actions
```

---

## 📄 **11. PRESCRIPTION CREATION (Doctor)**

```
Redesign the Doctor prescription creation modal/page:

CONTEXT:
- Doctor creates prescription for patient
- Multi-medication support
- Pre-filled with appointment context

REQUIREMENTS:
- Patient selection (dropdown or from appointment)
- Add medication form: Name, Dosage, Unit, Frequency, Timing, Duration
- Multiple medications (add/remove)
- Additional instructions field
- Preview prescription
- Save/Send to patient

DESIGN:
- Doctor color scheme
- Clean form layout
- Medication management (add/remove list)
- Real-time preview
- Mobile-friendly inputs

DELIVERABLES:
- Prescription form
- Medication input fields
- Medication list
- Preview modal
- Success state
```

---

## 📄 **12. HOSPITAL ADMIN DASHBOARD**

```
Redesign the Hospital Admin Dashboard:

CONTEXT:
- Hospital administrator manages facility operations
- Staff, departments, analytics, patients

REQUIREMENTS:
- KPI Cards: Total Staff, Active Doctors, Today's Appointments, Revenue
- Staff Management: Doctor/receptionist lists
- Department Overview: Specialty performance
- Analytics Charts: Revenue, appointments, patient flow
- Quick Actions: Add Staff, Assign Shift, Generate Reports

DESIGN:
- Hospital color scheme (#7C3AED)
- Data-heavy, analytics-focused
- Charts and visualizations
- Professional enterprise UI

DELIVERABLES:
- Desktop dashboard
- Analytics charts
- Staff management UI
- All states
```

---

## 📄 **13. LAB TECHNICIAN DASHBOARD**

```
Redesign the Lab Technician Dashboard:

CONTEXT:
- Lab technician manages samples and reports
- Queue-based workflow

REQUIREMENTS:
- KPI Cards: Pending Samples, Reports Ready, Critical Alerts
- Sample Pipeline: Received → In Progress → Completed
- Sample Queue: List with patient info, test type, priority
- Report Upload: File upload interface
- Quick Actions: Log Sample, Upload Report, Assign Technician

DESIGN:
- Lab color scheme (#0EA5E9)
- Queue-focused layout
- Priority indicators (critical/high/normal)
- File upload UI

DELIVERABLES:
- Dashboard layout
- Sample pipeline view
- Queue list
- Upload interface
- All states
```

---

## 📄 **14. RECEPTIONIST DASHBOARD**

```
Redesign the Receptionist Dashboard:

CONTEXT:
- Receptionist manages front desk operations
- Appointment confirmations, check-ins, queues

REQUIREMENTS:
- KPI Cards: Walk-ins Waiting, Check-ins Today, Pending Payments, Calls to Return
- Appointment Queue: List of pending/confirmed appointments
- Actions: Confirm Appointment, Check-in Patient, Record Payment
- Patient Search: Quick patient lookup
- Today's Schedule: Hourly view

DESIGN:
- Receptionist color scheme (#F97316)
- Operational, high-contrast
- Action-dense interface
- Time-based organization

DELIVERABLES:
- Dashboard layout
- Queue management
- Check-in interface
- All states
```

---

## 🎯 **Quick Copy-Paste Format**

For Figma Make web interface, use this format:

```
[PAGE_NAME] Redesign

Project: NexaCare Medical System - Healthcare Platform
Reference Screenshot: [ATTACH_SCREENSHOT]

[COPY_PROMPT_FROM_ABOVE]

Design System:
- Colors: [ROLE_COLOR]
- Typography: Inter, 8px grid
- Components: Ant Design-inspired
- Responsive: Desktop 1440px + Mobile 375px

Deliverables: Desktop + Mobile + All States
```

---

**Last Updated**: Wednesday, November 26, 2025 at 11:45 PM IST







