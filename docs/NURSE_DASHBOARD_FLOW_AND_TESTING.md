# Nurse Dashboard Flow and Testing Guide

## Overview
The Nurse Dashboard is designed for nurses to manage their ward patients, record vitals, and maintain nursing notes. It follows the same structure and flow as other working dashboards (Doctor, Patient, Hospital Admin).

## Dashboard Flow

### 1. **Authentication & Profile Loading**
- User logs in with nurse credentials
- Dashboard checks if user role is `NURSE`
- Fetches nurse profile from `/api/nurses/profile`
- Profile includes: nurse data, user data, hospital data, and `hospitalName`

### 2. **Data Loading**
The dashboard loads real data from multiple APIs:
- **IPD Encounters**: `/api/ipd/encounters?nurse=true` - Gets all patients under nurse's care
- **Vitals History**: `/api/clinical/vitals?nurse=true` - Gets all vitals recorded by nurse
- **Nursing Notes**: `/api/clinical/nursing-notes?nurse=true` - Gets all nursing notes

### 3. **KPI Calculations (Real Data)**
KPIs are calculated from real data:
- **My Patients**: Count of IPD encounters assigned to nurse
- **Critical Patients**: Patients with abnormal vitals (temp >38.5°C or <35°C, BP >180/<90, pulse >120/<50, respiration >30/<8)
- **Vitals Recorded Today**: Count of vitals recorded today (compared to yesterday)
- **Pending Tasks**: Estimated tasks (vitals, meds, notes) per patient

### 4. **Navigation Tabs**
- **My Ward (Dashboard)**: Main dashboard with KPIs, quick actions, and recent activity
- **Patient List**: Shows all IPD encounters with patient details
- **Vitals History**: Table of all vitals recorded by nurse
- **Nursing Notes**: List of all nursing notes

### 5. **Quick Actions**
- **Record Vitals**: Opens modal to record patient vitals
- **Add Nursing Note**: Opens modal to add nursing notes (coming soon)
- **Medication Admin**: Record medication administration (coming soon)
- **Shift Handover**: Document shift notes (coming soon)

## Manual Testing Guide

### Prerequisites
1. **Nurse Account**: Ensure you have a nurse account created
2. **Hospital Assignment**: Nurse must be assigned to a hospital
3. **IPD Patients**: Have at least one IPD encounter assigned to the nurse
4. **Test Data**: Some vitals and nursing notes for testing

### Step-by-Step Testing

#### 1. **Login as Nurse**
```
1. Navigate to /login
2. Enter nurse credentials
3. Should redirect to /dashboard/nurse
```

**Expected Results:**
- ✅ Sidebar shows nurse name, ID, and hospital name
- ✅ Dashboard loads without errors
- ✅ KPIs show real data (not all zeros if data exists)

#### 2. **Verify Hospital Name Display**
```
1. Check sidebar footer section
2. Look for hospital name below nurse ID
```

**Expected Results:**
- ✅ Hospital name appears below nurse ID in sidebar
- ✅ Hospital name is correct (matches nurse's assigned hospital)

#### 3. **Test Dashboard Tab (My Ward)**
```
1. Verify KPIs are displayed
2. Check if values match actual data
3. Verify quick action buttons are clickable
4. Check recent activity section
```

**Expected Results:**
- ✅ All 4 KPI cards display with correct values
- ✅ Badge text shows meaningful information (not hardcoded)
- ✅ Quick action buttons open modals or show messages
- ✅ Recent activity shows actual activities (if any)

#### 4. **Test Patient List Tab**
```
1. Click "Patient List" in sidebar
2. Verify IPD encounters are displayed
3. Check if "Record Vitals" button works
4. Verify patient details are correct
```

**Expected Results:**
- ✅ List shows all IPD encounters assigned to nurse
- ✅ Each patient card shows correct information
- ✅ "Record Vitals" button opens vitals modal
- ✅ Patient names, IDs, and statuses are correct

#### 5. **Test Vitals Recording**
```
1. Click "Record Vitals" on a patient
2. Fill in vitals form (BP, temperature, pulse, etc.)
3. Submit the form
4. Verify vitals appear in "Vitals History" tab
```

**Expected Results:**
- ✅ Modal opens with patient name
- ✅ Form accepts all vital sign inputs
- ✅ Submission succeeds and shows success message
- ✅ New vitals appear in vitals history
- ✅ KPI "Vitals Recorded Today" updates

#### 6. **Test Vitals History Tab**
```
1. Click "Vitals History" in sidebar
2. Verify table shows all vitals
3. Check date/time formatting
4. Verify patient names are correct
```

**Expected Results:**
- ✅ Table displays all vitals recorded by nurse
- ✅ Dates are formatted correctly (DD/MM/YYYY HH:mm)
- ✅ Patient names match actual patients
- ✅ Vital values are displayed correctly

#### 7. **Test Nursing Notes Tab**
```
1. Click "Nursing Notes" in sidebar
2. Verify notes are displayed
3. Check note types and dates
```

**Expected Results:**
- ✅ List shows all nursing notes
- ✅ Note types are displayed (assessment, care_plan, shift_handover)
- ✅ Dates are formatted correctly

#### 8. **Test Critical Patients Detection**
```
1. Record vitals with abnormal values (e.g., temp >38.5°C)
2. Check "Critical Patients" KPI
3. Verify patient appears in critical list
```

**Expected Results:**
- ✅ Critical Patients KPI increases
- ✅ Badge text changes to "Needs attention"
- ✅ Patient with abnormal vitals is identified

#### 9. **Test Responsive Design**
```
1. Resize browser window to mobile size
2. Verify sidebar becomes drawer
3. Check if all features work on mobile
```

**Expected Results:**
- ✅ Sidebar converts to mobile drawer
- ✅ Menu button appears in header
- ✅ All tabs and features work on mobile
- ✅ Layout is responsive and usable

#### 10. **Test Real-Time Updates**
```
1. Open dashboard in one tab
2. Record vitals in another tab (or via API)
3. Verify dashboard updates automatically
```

**Expected Results:**
- ✅ KPIs update when new data is added
- ✅ Vitals history refreshes
- ✅ Patient list updates

## Common Issues and Fixes

### Issue 1: Hospital Name Not Showing
**Cause**: Nurse profile doesn't include `hospitalName` field
**Fix**: Check that nurse route transforms data to include `hospitalName` (already fixed)

### Issue 2: All KPIs Show Zero
**Cause**: No IPD encounters assigned to nurse or no vitals recorded
**Fix**: 
- Assign IPD encounters to nurse via hospital admin
- Record some vitals for testing

### Issue 3: Welcome Card Taking Space
**Cause**: Welcome card was removed but might still be in code
**Fix**: Already removed - dashboard now starts with KPIs directly

### Issue 4: Mock Data Instead of Real Data
**Cause**: API endpoints not implemented or returning empty arrays
**Fix**: 
- Check API endpoints are working
- Verify nurse is assigned to hospital
- Ensure IPD encounters exist

## API Endpoints Used

1. **GET /api/nurses/profile** - Get nurse profile with hospital info
2. **GET /api/ipd/encounters?nurse=true** - Get IPD encounters for nurse
3. **GET /api/clinical/vitals?nurse=true** - Get vitals recorded by nurse
4. **GET /api/clinical/nursing-notes?nurse=true** - Get nursing notes
5. **POST /api/clinical/vitals** - Record new vitals

## Data Flow Diagram

```
Login → Auth Check → Fetch Nurse Profile → Fetch IPD Encounters
                                              ↓
                                    Fetch Vitals History
                                              ↓
                                    Fetch Nursing Notes
                                              ↓
                                    Calculate KPIs (Real Data)
                                              ↓
                                    Display Dashboard
```

## Testing Checklist

- [ ] Login as nurse works
- [ ] Hospital name displays in sidebar
- [ ] KPIs show real data (not all zeros)
- [ ] Patient list shows assigned patients
- [ ] Record vitals works
- [ ] Vitals appear in history
- [ ] Critical patients detected correctly
- [ ] Navigation between tabs works
- [ ] Mobile responsive design works
- [ ] Real-time updates work

## Notes

- The dashboard uses **real data** from the database
- KPIs are calculated from actual IPD encounters and vitals
- Hospital name is fetched from nurse profile (includes hospital join)
- All features follow the same pattern as Doctor and Patient dashboards
- **Welcome card has been removed** - Dashboard now starts directly with KPIs to save space
- **Recent Activity** section shows real data from vitals and nursing notes (not mock data)

