# Complete Lab Test Feature Flow - Testing Guide

## Overview
This guide walks you through testing the complete lab test workflow from doctor recommendation to patient viewing results.

## Flow Summary
```
1. Doctor → Recommends Lab Test (from prescription form)
   ↓ Status: "recommended"
2. Receptionist → Confirms with Patient
   ↓ Status: "pending" (sent to lab)
3. Lab Technician → Sees Request & Processes
   ↓ Status: "processing" → "ready" → "completed"
4. Notifications → Sent to Patient & Doctor
5. Patient & Doctor → View Results
```

---

## Prerequisites

### Required User Accounts
You'll need to log in as different roles. Use these test accounts:

**Doctor Account:**
- Email: Check `ALL_USER_CREDENTIALS.md` for a doctor account
- Role: DOCTOR

**Receptionist Account:**
- Email: Check `ALL_USER_CREDENTIALS.md` for a receptionist account
- Role: RECEPTIONIST

**Lab Technician Account:**
- Email: Check `ALL_USER_CREDENTIALS.md` for a lab technician account
- Role: LAB

**Patient Account:**
- Email: Check `ALL_USER_CREDENTIALS.md` for a patient account
- Role: PATIENT

### Setup
1. Ensure the server is running: `npm run dev`
2. Have 4 browser tabs/windows ready (one for each role)
3. Ensure there's at least one appointment between the doctor and patient

---

## Step-by-Step Testing

### **STEP 1: Doctor Recommends Lab Test** ⚕️

**User:** Doctor  
**Location:** Doctor Dashboard

1. **Login as Doctor**
   - Navigate to login page
   - Enter doctor credentials
   - Access doctor dashboard

2. **Start Consultation or Add Prescription**
   - Find an appointment with a patient (status: `checked-in` or `in_consultation`)
   - Click "Start Consultation" or "Add Prescription" button
   - This opens the prescription form modal

3. **Open Lab Request Modal**
   - In the prescription form, click **"Recommend Lab Test"** button (beaker icon)
   - The lab request modal should open **on top** of the prescription modal (z-index fixed)

4. **Fill Lab Request Form**
   - **Patient**: Should be pre-filled with the selected patient name (not ID)
   - **Preferred Lab**: Optional - select a lab or leave blank
   - **Test Name**: 
     - Type or select from dropdown (e.g., "Complete Blood Count (CBC)", "Blood Glucose (Fasting)")
     - Can add multiple tests using tags mode
   - **Priority**: Select using radio buttons:
     - 🔵 Normal (default)
     - 🟠 High
     - 🔴 Urgent
   - **Requested Date**: Select date (defaults to today)
   - **Clinical Notes**: Optional - add reason for test
   - **Special Instructions**: Optional - add instructions for lab

5. **Submit Request**
   - Click **"Request Test"** button
   - Should see success message: "Lab test recommended successfully"
   - Modal closes
   - **Expected Result**: Lab report created with status `"recommended"`

**✅ Verification:**
- Check browser console for successful API call: `POST /api/labs/requests`
- No errors in console
- Success notification appears

---

### **STEP 2: Receptionist Confirms Lab Recommendation** 📋

**User:** Receptionist  
**Location:** Receptionist Dashboard

1. **Login as Receptionist**
   - Open new browser tab/window
   - Login with receptionist credentials
   - Access receptionist dashboard

2. **Find Patient with Recommended Lab Test**
   - In the appointments table, find the patient for whom the doctor recommended the test
   - Click **"View Patient Info"** button (eye icon) or similar action button
   - This opens the Patient Info Drawer

3. **View Recommended Lab Tests**
   - In the Patient Info Drawer, scroll to **"Recommended Lab Tests"** section
   - You should see the lab test(s) recommended by the doctor
   - Each test should show:
     - Test Name
     - Date
     - Status: "Recommended"
     - **"Confirm & Send to Lab"** button

4. **Confirm Lab Test**
   - Click **"Confirm & Send to Lab"** button on the recommended test
   - Should see success message
   - **Expected Result**: 
     - Status changes from `"recommended"` to `"pending"`
     - Test is now sent to the lab dashboard

**✅ Verification:**
- Recommended test disappears from "Recommended Lab Tests" section
- Check browser console: `POST /api/reception/lab-recommendations/:reportId/confirm`
- Status in database should be `"pending"`

---

### **STEP 3: Lab Technician Sees Request** 🔬

**User:** Lab Technician  
**Location:** Lab Dashboard

1. **Login as Lab Technician**
   - Open new browser tab/window
   - Login with lab technician credentials
   - Access lab dashboard

2. **Check Lab Dashboard**
   - Look at the **"Lab Reports Queue"** card
   - Check the **"Pending"** tab or main table
   - You should see the lab request with:
     - Patient name
     - Test name
     - Date
     - Status: "Pending"
     - Priority badge (Normal/High/Urgent)
     - **"Edit"** or **"Process"** button

3. **Verify Request Details**
   - Click on the request to view details
   - Verify:
     - Patient information is correct
     - Test name matches what doctor entered
     - Priority is correct
     - Clinical notes are visible (if provided)
     - Special instructions are visible (if provided)

**✅ Verification:**
- Request appears in lab dashboard
- All information is correct
- Status is "Pending"
- Request is NOT in "Recommended" status (should be filtered out)

---

### **STEP 4: Lab Technician Processes Request** 🔬

**User:** Lab Technician  
**Location:** Lab Dashboard

1. **Start Processing**
   - Click **"Edit"** or **"Process"** button on the lab request
   - This opens the `LabReportUploadModal`

2. **Update Report Status**
   - **Status**: Change from "Pending" to:
     - `"processing"` - Sample is being processed
     - `"ready"` - Results are ready
     - `"completed"` - Report is finalized
   
3. **Add Results**
   - **Results**: Enter test results (e.g., "All values within normal range", "Glucose: 95 mg/dL")
   - **Notes**: Add any additional notes
   - **Report URL**: Upload report file if available (optional)

4. **Save Report**
   - Click **"Save"** or **"Update Report"** button
   - Should see success message
   - Modal closes

**✅ Verification:**
- Status updates in lab dashboard
- Results are saved
- Check browser console: `PUT /api/labs/reports/:id` or `PATCH /api/labs/reports/:id/status`

---

### **STEP 5: Notifications Sent** 🔔

**Users:** Patient & Doctor  
**Location:** Respective Dashboards

1. **Check Patient Notifications**
   - Switch to patient browser tab
   - Look for notification bell icon in header
   - Should see a badge with unread count
   - Click notification bell
   - Should see notification: "Lab report for [Test Name] is now ready/completed"
   - Notification should be clickable

2. **Check Doctor Notifications**
   - Switch to doctor browser tab
   - Look for notification bell icon
   - Should see notification about lab report completion
   - Notification should include patient name and test name

**✅ Verification:**
- Both patient and doctor receive notifications
- Notifications are marked as unread initially
- Notifications contain relevant information

---

### **STEP 6: View Results** 👁️

#### **6A: Patient Views Results**

**User:** Patient  
**Location:** Patient Dashboard

1. **Access Lab Reports**
   - In patient dashboard, look for "Lab Reports" in sidebar menu
   - OR check if lab reports are shown in a dedicated section
   - Click to view lab reports

2. **View Report Details**
   - Should see the completed lab report
   - Verify:
     - Test name
     - Date
     - Status: "Ready" or "Completed"
     - Results
     - Doctor who ordered it

**✅ Verification:**
- Patient can see their lab reports
- All information is displayed correctly
- Report status is "Ready" or "Completed"

#### **6B: Doctor Views Results**

**User:** Doctor  
**Location:** Doctor Dashboard

1. **View in Patient Info**
   - Find the same patient appointment
   - Click "View Patient Info" or similar
   - Look for "Lab Reports" section in the drawer
   - Should see the completed lab report

2. **Verify Report Details**
   - Test name matches what was ordered
   - Results are visible
   - Status is correct
   - Date is correct

**✅ Verification:**
- Doctor can see lab reports in patient info drawer
- All information is correct

---

## Complete Flow Checklist

Use this checklist to ensure all steps work correctly:

### Doctor Side
- [ ] Doctor can open lab request modal from prescription form
- [ ] Patient name displays correctly (not ID)
- [ ] Test Type field is removed (only Test Name)
- [ ] Priority uses radio buttons (Normal/High/Urgent)
- [ ] Form submits successfully
- [ ] Success notification appears

### Receptionist Side
- [ ] Recommended lab tests appear in patient info drawer
- [ ] "Confirm & Send to Lab" button works
- [ ] Status changes from "recommended" to "pending"
- [ ] Test appears in lab dashboard after confirmation

### Lab Technician Side
- [ ] Lab request appears in dashboard
- [ ] Request is NOT in "recommended" status (filtered out)
- [ ] All request details are visible
- [ ] Can edit/process the request
- [ ] Can update status (pending → processing → ready → completed)
- [ ] Can add results and notes
- [ ] Changes save successfully

### Notifications
- [ ] Patient receives notification when report is ready/completed
- [ ] Doctor receives notification when report is ready/completed
- [ ] Notifications contain correct information
- [ ] Notifications are clickable

### Viewing Results
- [ ] Patient can view lab reports
- [ ] Doctor can view lab reports in patient info drawer
- [ ] All report details are displayed correctly
- [ ] Status is correct

---

## Common Issues & Troubleshooting

### Issue: Patient name shows as ID in lab request modal
**Solution:** Check that `patientsOverride` is being passed correctly from prescription form

### Issue: Lab request doesn't appear in lab dashboard
**Solution:** 
- Verify receptionist confirmed the recommendation (status should be "pending", not "recommended")
- Check that lab technician is associated with the correct lab
- Verify lab dashboard is filtering correctly

### Issue: Notifications not appearing
**Solution:**
- Check browser console for notification API errors
- Verify notification service is running
- Check that notification bell component is mounted

### Issue: Test Type still required
**Solution:** 
- Verify backend `createLabRequest` accepts optional `testType`
- Check that auto-derivation function is working
- Clear browser cache and reload

### Issue: Priority radio buttons not working
**Solution:**
- Verify `Radio` component is imported from antd
- Check that `initialValue="normal"` is set
- Verify form validation rules

---

## API Endpoints Used

1. `POST /api/labs/requests` - Doctor creates lab request
2. `GET /api/reception/patients/:patientId/lab-recommendations` - Get recommended tests
3. `POST /api/reception/lab-recommendations/:reportId/confirm` - Receptionist confirms
4. `GET /api/labs/me/reports` - Lab technician gets reports
5. `PUT /api/labs/reports/:id` - Update lab report
6. `PATCH /api/labs/reports/:id/status` - Update report status
7. `GET /api/labs/patient/reports` - Patient gets reports
8. `GET /api/labs/doctor/reports` - Doctor gets reports

---

## Database Status Flow

```
recommended → pending → processing → ready → completed
     ↓            ↓           ↓          ↓         ↓
  Doctor    Receptionist  Lab Tech   Lab Tech  Lab Tech
  creates   confirms      starts     finishes  finalizes
```

---

## Test Data Examples

### Test Names to Try:
- "Complete Blood Count (CBC)" → Auto-derives: "Blood Test"
- "Chest X-Ray" → Auto-derives: "X-Ray"
- "Blood Glucose (Fasting)" → Auto-derives: "Blood Test"
- "Urine Routine" → Auto-derives: "Urine Test"
- "ECG" → Auto-derives: "ECG"

### Priority Options:
- Normal (default)
- High
- Urgent

---

## Success Criteria

✅ **Complete flow works end-to-end:**
- Doctor can recommend test
- Receptionist can confirm
- Lab technician can process
- Notifications are sent
- Results are viewable by patient and doctor

✅ **UI/UX is correct:**
- Patient name displays correctly
- Test Type field is removed
- Priority uses radio buttons
- Modals have correct z-index
- All buttons and forms work

✅ **Data integrity:**
- Status transitions are correct
- All information is preserved
- Notifications contain correct data

---

## Next Steps After Testing

If all tests pass:
1. Document any edge cases found
2. Note any UI improvements needed
3. Verify performance with multiple concurrent requests
4. Test with different user roles and permissions

If issues are found:
1. Note the specific step where issue occurs
2. Check browser console for errors
3. Verify API responses
4. Check database state
5. Report issues with steps to reproduce



