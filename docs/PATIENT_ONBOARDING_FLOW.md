# Patient Onboarding Flow - Complete Guide

## Overview
This document explains the complete onboarding flow for new patients in the NexaCare Medical System.

---

## 🔄 Complete Onboarding Flow

### Step 1: Role Selection

**Entry Point:** `/register`

1. **User visits registration page** (`/register`)
   - Sees role selection screen with available roles
   - Selects "I'm a Patient" option
   - Clicks on the patient card
   - Redirected to `/register/with-role?role=patient`

### Step 2: Account Creation (Unified Registration Flow)

**Location:** `/register/with-role`

**Multi-Step Registration Process:**

1. **Step 1: Select Role** (if not pre-selected)
   - User confirms or selects their role
   - Proceeds to account information

2. **Step 2: Account Information**
   - **Full Name** (required)
   - **Email** (required, validated)
   - **Mobile Number** (required, 10-digit Indian mobile, validated)
   - Clicks "Send OTP"

3. **Step 3: OTP Verification**
   - Receives OTP via SMS
   - Enters 6-digit OTP
   - Clicks "Verify OTP"

4. **Step 4: Set Password**
   - **Password** (required, min 6 characters)
   - **Confirm Password** (required, must match)
   - Clicks "Complete Registration"

5. **Step 5: Registration Complete**
   - Account created successfully
   - Authentication token saved
   - User role stored in localStorage
   - **Automatic redirect to onboarding** (`/onboarding/patient`)

### Step 3: Onboarding Check

**Automatic Redirect Logic:**

When a logged-in patient tries to access `/dashboard/patient`:

1. **`useOnboardingCheck` hook** (in `client/src/hooks/use-onboarding-check.tsx`) runs
2. **Checks onboarding status** via API: `GET /api/onboarding/patient/status`
3. **Backend checks:**
   - If patient profile exists
   - If required fields are filled (dateOfBirth, gender)
   - Returns `isCompleted: true/false`

4. **If onboarding incomplete:**
   - User is automatically redirected to `/onboarding/patient`
   - Cannot access dashboard until onboarding is complete

5. **If onboarding complete:**
   - User can access dashboard normally

### Step 4: Patient Onboarding Form

**Location:** `/onboarding/patient`

**Three-Step Process:**

#### Step 1: Personal Information
- **Date of Birth** (required)
- **Gender** (required: Male, Female, Other)
- **Blood Group** (optional)
- **Height** (optional, in cm)
- **Weight** (optional, in kg)

#### Step 2: Medical History
- **Medical History** (optional)
- **Allergies** (optional)
- **Current Medications** (optional)
- **Chronic Conditions** (optional)

#### Step 3: Emergency & Insurance
- **Emergency Contact Name** (required)
- **Emergency Contact Number** (required, 10-digit)
- **Emergency Contact Relationship** (optional)
- **Insurance Provider** (optional)
- **Insurance Number** (optional)

### Step 5: Form Submission

1. **User clicks "Complete Profile"** on final step
2. **Frontend validates** all required fields
3. **Data is transformed:**
   - DatePicker Dayjs object → ISO string (YYYY-MM-DD)
   - All form values collected
4. **API Call:** `POST /api/onboarding/patient/complete`
5. **Backend:**
   - Checks if patient profile exists
   - Creates or updates patient record in `patients` table
   - Returns success response

### Step 6: Completion & Redirect

1. **On success:**
   - Success message displayed: "Profile completed successfully! Welcome to NexaCare!"
   - LocalStorage flags set:
     - `onboarding-just-completed: 'true'`
     - `onboarding-completed-timestamp: <timestamp>`
   - Query cache invalidated for onboarding status
   - Redirect to `/dashboard/patient` after 500ms delay

2. **Onboarding check bypass:**
   - Flags prevent redirect loop
   - Flags cleared after 5 seconds
   - Status check happens on next dashboard visit

---

## 🔍 Technical Details

### API Endpoints

#### 1. Check Onboarding Status
```
GET /api/onboarding/patient/status
Headers: Authorization: Bearer <token>
Response: {
  userId: number,
  hasProfile: boolean,
  isCompleted: boolean,
  isComplete: boolean, // backward compatibility
  profile: Patient | null,
  user: User
}
```

#### 2. Complete Onboarding
```
POST /api/onboarding/patient/complete
Headers: Authorization: Bearer <token>
Body: {
  dateOfBirth: string (YYYY-MM-DD),
  gender: string,
  bloodGroup?: string,
  height?: number,
  weight?: number,
  medicalHistory?: string,
  allergies?: string,
  currentMedications?: string,
  chronicConditions?: string,
  emergencyContactName: string,
  emergencyContact: string,
  emergencyRelation?: string,
  insuranceProvider?: string,
  insuranceNumber?: string
}
Response: {
  success: boolean,
  patient: Patient,
  isNew: boolean
}
```

### Database Schema

**`patients` table:**
- `userId` (FK to users.id)
- `dateOfBirth` (timestamp, required for completion)
- `gender` (text, required for completion)
- `bloodGroup` (text, optional)
- `height` (decimal, optional)
- `weight` (decimal, optional)
- `medicalHistory` (text, optional)
- `allergies` (text, optional)
- `currentMedications` (text, optional)
- `chronicConditions` (text, optional)
- `emergencyContactName` (text, optional)
- `emergencyContact` (text, optional)
- `emergencyRelation` (text, optional)
- `insuranceProvider` (text, optional)
- `insuranceNumber` (text, optional)

### Completion Criteria

Onboarding is considered **complete** when:
- Patient profile exists (`hasProfile: true`)
- `dateOfBirth` is not null
- `gender` is not null and not empty string

---

## 🚀 User Journey Examples

### Example 1: New Patient Registration

1. **User visits** `/register`
2. **Selects** "I'm a Patient"
3. **Redirected to** `/register/with-role?role=patient`
4. **Fills out registration:**
   - Account Info (Name, Email, Mobile)
   - Verifies OTP
   - Sets Password
5. **Account created** → Auto-redirects to `/onboarding/patient`
6. **Fills out** all three onboarding steps:
   - Personal Info (Date of Birth, Gender required)
   - Medical History (all optional)
   - Emergency & Insurance (Contact Name & Number required)
5. **Clicks** "Complete Profile"
6. **Sees** success message
7. **Redirected to** `/dashboard/patient`
8. **Can now** access all patient features

### Example 2: Existing User with Incomplete Profile

1. **User logs in** with existing account
2. **Tries to access** `/dashboard/patient`
3. **Onboarding check** runs automatically
4. **Detects** incomplete profile (missing dateOfBirth or gender)
5. **Redirects to** `/onboarding/patient`
6. **User completes** missing information
7. **Submits** form
8. **Redirected to** dashboard

### Example 3: Returning User with Complete Profile

1. **User logs in** with complete profile
2. **Accesses** `/dashboard/patient`
3. **Onboarding check** runs
4. **Detects** complete profile
5. **No redirect** - user sees dashboard immediately

---

## 🛡️ Error Handling

### Validation Errors
- **Frontend validation** prevents submission if required fields are missing
- **Error messages** displayed below fields
- **Navigation** automatically jumps to step with error

### API Errors
- **Network errors** show generic error message
- **Validation errors** from backend are displayed
- **User can retry** submission

### Redirect Loops Prevention
- **LocalStorage flags** prevent infinite redirects
- **Timestamp check** ensures flags are valid
- **Status verification** happens after completion

---

## 📝 Notes

1. **Account Creation:** Currently, patient onboarding assumes user is already registered. Account creation happens separately (via `/register` → OTP verification → account creation).

2. **Optional Fields:** Most fields in steps 2 and 3 are optional, making onboarding quick for users who want to provide minimal information.

3. **Profile Updates:** Users can update their profile later through dashboard settings (if implemented).

4. **Mobile Responsive:** The onboarding form is fully responsive and works on mobile devices.

5. **Form Persistence:** Form values are preserved across steps using Ant Design's `preserve` prop.

---

## 🔄 Future Enhancements

1. **Account Creation Integration:** Combine account creation and onboarding into a single flow
2. **Progress Saving:** Auto-save progress as user fills out form
3. **Skip Options:** Allow users to skip optional steps
4. **Profile Completion Percentage:** Show completion percentage
5. **Multi-step Validation:** Validate each step before allowing progression
