# Onboarding Requirements for All Roles

## Overview
This document outlines the complete onboarding flow and data collection requirements for each user role in the NexaCare Medical System.

## Flow Structure
1. **Role Selection** (First Step) - User chooses their role
2. **Account Creation** - Basic user account (email, mobile, password, OTP verification)
3. **Role-Specific Onboarding** - Collect role-specific information
4. **Profile Completion** - Redirect to appropriate dashboard

---

## 1. PATIENT Onboarding

### Step 1: Role Selection
- User selects "I'm a Patient" from role selection screen

### Step 2: Account Creation
- **Full Name** (required)
- **Email** (required, validated)
- **Mobile Number** (required, 10-digit Indian mobile, validated)
- **Password** (required, min 6 characters)
- **Confirm Password** (required, must match)
- **OTP Verification** (sent to mobile number)

### Step 3: Personal Information
- **Date of Birth** (required)
- **Gender** (required: Male, Female, Other)
- **Blood Group** (optional: A+, A-, B+, B-, AB+, AB-, O+, O-)
- **Height** (optional, in cm)
- **Weight** (optional, in kg)

### Step 4: Medical History
- **Medical History** (optional, text area)
- **Allergies** (optional, text area - medications, food, etc.)
- **Current Medications** (optional, text area)
- **Chronic Conditions** (optional, text area)

### Step 5: Emergency & Insurance
- **Emergency Contact Name** (required)
- **Emergency Contact Number** (required)
- **Emergency Contact Relationship** (optional)
- **Insurance Provider** (optional)
- **Insurance Number** (optional)

### Additional Optional Fields (can be added later)
- Address, City, State, Zip Code
- Occupation
- Marital Status

---

## 2. HOSPITAL Onboarding

### Step 1: Role Selection
- User selects "I manage a Hospital" from role selection screen

### Step 2: Account Creation
- **Full Name** (Administrator full name, required)
- **Email** (required, validated)
- **Mobile Number** (required, 10-digit Indian mobile, validated)
- **Password** (required, min 6 characters)
- **Confirm Password** (required, must match)
- **OTP Verification** (sent to mobile number)

### Step 3: Hospital Basics
- **Hospital Name** (required)
- **License Number** (required)
- **Established Year** (optional, number)
- **Total Beds** (optional, number)

### Step 4: Location & Contact
- **Street & Area** (required)
- **City** (required)
- **State** (required, dropdown from states table)
- **Zip Code** (required)
- **Contact Email** (optional)
- **Website** (optional, URL)

### Step 5: Operations & Services
- **Departments** (optional, multi-select tags)
- **Services Offered** (optional, multi-select tags)
- **Operating Hours** (required, time range picker: start time - end time)
- **Emergency Services** (required, toggle: Yes/No)
- **Photo URLs** (optional, multi-select tags)

---

## 3. NURSE Onboarding

### Step 1: Role Selection
- User selects "I'm a Nurse" from role selection screen

### Step 2: Account Creation
- **Full Name** (required)
- **Email** (required, validated)
- **Mobile Number** (required, 10-digit Indian mobile, validated)
- **Password** (required, min 6 characters)
- **Confirm Password** (required, must match)
- **OTP Verification** (sent to mobile number)

### Step 3: Hospital Selection
- **Hospital** (required, searchable dropdown - must select from existing hospitals)

### Step 4: Professional Qualifications
- **Nursing Degree** (required, dropdown):
  - BSc Nursing
  - General Nursing and Midwifery (GNM)
  - Auxiliary Nurse Midwife (ANM)
  - Post Basic BSc Nursing
  - MSc Nursing
  - Other
- **License Number** (required)

### Step 5: Specialization & Experience
- **Specialization** (optional, dropdown or text):
  - ICU
  - Pediatrics
  - Oncology
  - General Ward
  - Emergency
  - Surgery
  - Maternity
  - Other
- **Experience** (optional, number in years)

### Step 6: Work Details
- **Shift Type** (required, dropdown: day, night, rotation)
- **Working Hours** (optional, text or time range)
- **Ward Preferences** (optional, multi-select or tags - preferred wards)
- **Skills** (optional, multi-select or tags - nursing skills)
- **Languages** (optional, multi-select or tags)
- **Certifications** (optional, text area)
- **Bio** (optional, text area)

---

## 4. PHARMACIST Onboarding

### Step 1: Role Selection
- User selects "I'm a Pharmacist" from role selection screen

### Step 2: Account Creation
- **Full Name** (required)
- **Email** (required, validated)
- **Mobile Number** (required, 10-digit Indian mobile, validated)
- **Password** (required, min 6 characters)
- **Confirm Password** (required, must match)
- **OTP Verification** (sent to mobile number)

### Step 3: Hospital Selection
- **Hospital** (required, searchable dropdown - must select from existing hospitals)

### Step 4: Professional Qualifications
- **Pharmacy Degree** (required, dropdown):
  - BPharm (Bachelor of Pharmacy)
  - MPharm (Master of Pharmacy)
  - PharmD (Doctor of Pharmacy)
  - DPharm (Diploma in Pharmacy)
  - Other
- **License Number** (required)

### Step 5: Specialization & Experience
- **Specialization** (optional, dropdown or text):
  - Clinical Pharmacy
  - Oncology Pharmacy
  - Pediatric Pharmacy
  - Hospital Pharmacy
  - Retail Pharmacy
  - Other
- **Experience** (optional, number in years)

### Step 6: Work Details
- **Shift Type** (required, dropdown: day, night, rotation)
- **Working Hours** (optional, text or time range)
- **Pharmacy Type** (required, dropdown: hospital, retail, clinical)
- **Languages** (optional, multi-select or tags)
- **Certifications** (optional, text area)
- **Bio** (optional, text area)

---

## 5. RADIOLOGY TECHNICIAN Onboarding

### Step 1: Role Selection
- User selects "I am a Radiology Technician" from role selection screen

### Step 2: Account Creation
- **Full Name** (required)
- **Email** (required, validated)
- **Mobile Number** (required, 10-digit Indian mobile, validated)
- **Password** (required, min 6 characters)
- **Confirm Password** (required, must match)
- **OTP Verification** (sent to mobile number)

### Step 3: Hospital Selection
- **Hospital** (required, searchable dropdown - must select from existing hospitals)

### Step 4: Professional Qualifications
- **Radiology Degree** (required, dropdown):
  - B.Sc Radiology
  - Diploma in Radiology
  - B.Sc Medical Imaging Technology
  - M.Sc Radiology
  - Other
- **License Number** (required)

### Step 5: Specialization & Experience
- **Specialization** (optional, dropdown or text):
  - X-Ray
  - CT Scan
  - MRI
  - Ultrasound
  - Mammography
  - Nuclear Medicine
  - Other
- **Experience** (optional, number in years)

### Step 6: Work Details
- **Shift Type** (required, dropdown: day, night, rotation)
- **Working Hours** (optional, text or time range)
- **Modalities** (optional, multi-select or tags - imaging modalities they can operate)
- **Languages** (optional, multi-select or tags)
- **Certifications** (optional, text area)
- **Bio** (optional, text area)

---

## 6. DOCTOR Onboarding (Coming Soon)

### Step 1: Role Selection
- User selects "I'm a Doctor" from role selection screen

### Step 2: Account Creation
- **Full Name** (required)
- **Email** (required, validated)
- **Mobile Number** (required, 10-digit Indian mobile, validated)
- **Password** (required, min 6 characters)
- **Confirm Password** (required, must match)
- **OTP Verification** (sent to mobile number)

### Step 3: Hospital Selection
- **Hospital** (required, searchable dropdown - must select from existing hospitals)

### Step 4: Professional Qualifications
- **Specialty** (required, dropdown or searchable select)
- **Qualification** (required, text area - MD, MBBS, etc.)
- **License Number** (required)
- **Experience** (optional, number in years)

### Step 5: Practice Details
- **Consultation Fee** (optional, decimal)
- **Working Hours** (optional, text or time range)
- **Available Slots** (optional, text - slot configuration)
- **Languages** (optional, multi-select or tags)
- **Awards** (optional, text area)
- **Bio** (optional, text area)

---

## 7. RECEPTIONIST Onboarding (Coming Soon)

### Step 1: Role Selection
- User selects "I'm a Receptionist" from role selection screen

### Step 2: Account Creation
- **Full Name** (required)
- **Email** (required, validated)
- **Mobile Number** (required, 10-digit Indian mobile, validated)
- **Password** (required, min 6 characters)
- **Confirm Password** (required, must match)
- **OTP Verification** (sent to mobile number)

### Step 3: Hospital Selection
- **Hospital** (required, searchable dropdown - must select from existing hospitals)

### Step 4: Work Details
- **Employee ID** (optional)
- **Department** (optional)
- **Shift** (optional, dropdown: day, night, rotation)
- **Working Hours** (optional, text or time range)
- **Date of Joining** (optional, date picker)
- **Permissions** (optional, multi-select - specific permissions)

---

## 8. LAB Onboarding (Coming Soon)

### Step 1: Role Selection
- User selects "I run a Lab" from role selection screen

### Step 2: Account Creation
- **Full Name** (required)
- **Email** (required, validated)
- **Mobile Number** (required, 10-digit Indian mobile, validated)
- **Password** (required, min 6 characters)
- **Confirm Password** (required, must match)
- **OTP Verification** (sent to mobile number)

### Step 3: Lab Basics
- **Lab Name** (required)
- **License Number** (required)
- **Address** (required)
- **City** (required)
- **State** (required)
- **Zip Code** (required)

### Step 4: Lab Details
- **Contact Email** (optional)
- **Operating Hours** (optional, text or time range)
- **Specializations** (optional, multi-select or tags)
- **Test Categories** (optional, multi-select or tags)
- **Equipment** (optional, multi-select or tags)
- **Accreditation** (optional, text)

---

## Common Patterns Across All Roles

### Account Creation (All Roles)
1. Full Name
2. Email
3. Mobile Number
4. Password
5. Confirm Password
6. OTP Verification

### Hospital-Linked Roles (Nurse, Pharmacist, Radiology Technician, Doctor, Receptionist)
- Must select a hospital from existing hospitals
- Hospital selection happens after account creation
- Hospital admin may need to approve these users

### Professional Roles (Nurse, Pharmacist, Radiology Technician, Doctor)
- License Number (required)
- Degree/Qualification (required)
- Specialization (optional)
- Experience (optional)
- Shift Type (required for staff roles)
- Working Hours (optional)
- Languages (optional)
- Certifications (optional)
- Bio (optional)

---

## UI/UX Design Patterns

### Step Indicator
- Use Ant Design Steps component
- Show progress (Step X of Y)
- Visual indicators for completed, active, and pending steps
- Icons for each step

### Form Layout
- Use Ant Design Form component
- Vertical layout for form fields
- Responsive grid (Row/Col) for field arrangement
- Consistent spacing and padding

### Validation
- Real-time validation on blur
- Required field indicators
- Error messages below fields
- Prevent progression until current step is valid

### Navigation
- "Previous" button (except on first step)
- "Next" button (validates current step before proceeding)
- "Complete" button on final step
- Disable navigation until account is created (for multi-step onboarding)

### Visual Design
- Match existing dashboard styling
- Use consistent color scheme
- Card-based layout with rounded corners
- Proper spacing and typography
- Loading states for async operations

---

## Implementation Notes

1. **Role Selection Screen**: Already exists at `/register` - can be enhanced
2. **Account Creation**: Should be consistent across all roles
3. **OTP Verification**: Required before proceeding to role-specific onboarding
4. **Hospital Selection**: For hospital-linked roles, fetch hospitals from API
5. **Form Persistence**: Use Form's `preserve` prop to maintain values across steps
6. **Onboarding Status**: Check onboarding completion status before allowing dashboard access
7. **Redirect Logic**: After onboarding completion, redirect to appropriate dashboard

---

## Next Steps

1. Create unified onboarding component structure
2. Implement role-specific onboarding steps
3. Integrate with existing authentication flow
4. Add onboarding status checks
5. Test all onboarding flows
6. Add validation and error handling
7. Match UI/UX with existing dashboards
