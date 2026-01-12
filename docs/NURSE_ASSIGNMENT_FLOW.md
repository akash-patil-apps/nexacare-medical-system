# Nurse Assignment Flow for IPD Patients

## Complete Workflow

### 1. Patient Admission (Receptionist)
- Receptionist confirms appointment
- Admits patient to IPD
- Allocates bed
- Assigns doctor (admitting/attending)

### 2. Doctor Assigns Nurse to Patient

**Current Status:** Backend API exists, but UI needs to be implemented.

**API Endpoint:**
```
POST /api/ipd/encounters/:encounterId/assign-nurse
Body: {
  nurseId: number,
  reason?: string,
  shiftType?: string
}
```

**Required Roles:** DOCTOR, ADMIN, HOSPITAL

**How to Assign Nurse (Manual Process):**

1. **Doctor Dashboard → IPD Patients Tab**
   - View list of IPD patients
   - Select a patient
   - **TODO: Add "Assign Nurse" button/modal**

2. **Nurse Assignment Modal (To Be Implemented):**
   - Fetch available nurses: `GET /api/nurses?hospitalId={hospitalId}`
   - Display list of nurses
   - Select nurse
   - Optionally add reason and shift type
   - Submit assignment

3. **Backend Process:**
   - Updates `ipd_encounters.assigned_nurse_id`
   - Sets `assigned_at` timestamp
   - Sets `assigned_by_user_id` (doctor's user ID)
   - Creates record in `nurse_assignments` table
   - Sends notification to assigned nurse

### 3. Nurse Views Assigned Patients

**Nurse Dashboard → "My Ward" or "My Patients" Tab:**
- Shows all IPD encounters where `assigned_nurse_id = current nurse ID`
- Displays:
  - Patient name, age, gender
  - Bed number and ward
  - Attending doctor
  - Admission date
  - Status
  - Quick action buttons

### 4. Nurse Actions on Assigned Patients

**Available Actions:**
1. **Record Vitals** - Record patient vital signs
2. **Add Nursing Notes** - Document patient care
3. **View Medications** - See doctor's medication orders
4. **Administer Medications** - Mark medications as given
5. **View Activity Log** - See all actions for the patient

## Current Implementation Status

### ✅ Backend (Complete)
- Database schema with nurse assignment fields
- API endpoints for nurse assignment
- Nurse assignment service
- Activity logging service
- Medication order and administration services

### ⚠️ Frontend (Partial)
- ✅ Nurse dashboard shows assigned patients
- ✅ Vitals recording works (with hospitalId fix)
- ✅ Nursing notes work (with hospitalId fix)
- ❌ **Missing: Doctor UI to assign nurses**
- ❌ **Missing: Nurse assignment modal/component**

## Next Steps to Complete

1. **Add "Assign Nurse" button in Doctor Dashboard IPD view**
2. **Create NurseAssignmentModal component**
3. **Fetch and display available nurses**
4. **Handle assignment submission**
5. **Show assigned nurse info in IPD patient list**

## Testing the Flow

### Current Workaround (Using API directly):

1. Get encounter ID from doctor dashboard
2. Get available nurses:
   ```bash
   curl -H "Authorization: Bearer {token}" \
     http://localhost:3000/api/nurses?hospitalId={hospitalId}
   ```
3. Assign nurse:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"nurseId": 1, "reason": "Primary care nurse", "shiftType": "day"}' \
     http://localhost:3000/api/ipd/encounters/{encounterId}/assign-nurse
   ```

### After UI Implementation:
- Doctor clicks "Assign Nurse" button
- Selects nurse from dropdown
- Submits form
- Nurse receives notification and sees patient in their dashboard

