# Lab Workflow Testing Guide

This guide covers testing the complete lab workflow features implemented in Phase 2.

## Prerequisites

1. **Start the application:**
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm run dev
   ```

2. **Required user accounts:**
   - Doctor account (role: `DOCTOR`)
   - Lab Technician account (role: `LAB`)
   - Patient account (role: `PATIENT`)

3. **Database should be running** (PostgreSQL via Neon)

---

## Test 1: Doctor Lab Request Interface

### Steps:

1. **Login as Doctor**
   - Navigate to `/login`
   - Login with doctor credentials
   - You should see the Doctor Dashboard

2. **Request a Lab Test**
   - On the dashboard, find the "Quick Actions" section
   - Click on **"Request Lab Test"** tile (or button on mobile)
   - The `LabRequestModal` should open

3. **Fill in the Lab Request Form:**
   - **Patient**: Select a patient from the dropdown
   - **Preferred Lab** (Optional): Select a lab or leave empty
   - **Test Name**: Type or select from common tests (e.g., "Complete Blood Count (CBC)")
   - **Test Type**: Select from dropdown (e.g., "Blood Test")
   - **Priority**: Choose Normal, High, or Urgent
   - **Requested Date**: Select a date (defaults to today)
   - **Clinical Notes** (Optional): Add any notes
   - **Special Instructions** (Optional): Add instructions for lab technician

4. **Submit the Request:**
   - Click **"Request Test"** button
   - You should see a success message: "Lab request created successfully"
   - The modal should close
   - The request should appear in the lab technician's queue

### Expected Results:
- ✅ Modal opens and closes correctly
- ✅ Form validation works (required fields)
- ✅ Success message appears
- ✅ Request is created in database
- ✅ Request appears in lab technician dashboard

### Test Edge Cases:
- Try submitting without required fields (should show validation errors)
- Try selecting an invalid date (should be disabled for past dates)
- Try with different priority levels

---

## Test 2: Lab Technician Queue Management

### Steps:

1. **Login as Lab Technician**
   - Navigate to `/login`
   - Login with lab technician credentials
   - You should see the Lab Dashboard

2. **View Doctor Requests**
   - On the dashboard, you should see a separate section titled **"Doctor Requests (X)"** with an orange "New" tag
   - This section shows all pending requests from doctors
   - Each request should show:
     - Patient name
     - Test name
     - Test type
     - Date
     - Status (should be "Pending")
     - Priority

3. **Process a Doctor Request:**
   - Find a request in the "Doctor Requests" section
   - Click **"Edit"** button on the request
   - The `LabReportUploadModal` should open with the request details pre-filled
   - Update the form:
     - **Results**: Enter test results (e.g., "Hemoglobin: 14.2 g/dL, WBC: 6.5 x 10^9/L")
     - **Normal Ranges**: Enter normal ranges (e.g., "Hemoglobin: 12-16 g/dL, WBC: 4-11 x 10^9/L")
     - **Status**: Change to "Processing" or "Ready"
     - **Notes**: Add any additional notes
   - Click **"Update Report"**

4. **Update Status Inline:**
   - In the lab reports table, find a report
   - In the "Status" column, use the dropdown to change status
   - Try changing status: `pending` → `processing` → `ready` → `completed`
   - Status should update immediately

5. **Filter Reports by Status:**
   - Use the status filter dropdown at the top of the "Lab Reports Queue" card
   - Filter by: All, Pending, Processing, Ready, Completed
   - Table should show only reports matching the selected status

### Expected Results:
- ✅ Doctor requests appear in separate section
- ✅ Requests are clearly marked as "New"
- ✅ Edit button opens modal with pre-filled data
- ✅ Status updates work inline
- ✅ Status filter works correctly
- ✅ Notifications are sent when status changes to "ready" or "completed"

### Test Edge Cases:
- Try updating status multiple times quickly
- Try filtering with no reports matching status
- Try editing a request that doesn't belong to your lab (should show error)

---

## Test 3: Patient Lab Report Viewing & Download

### Steps:

1. **Login as Patient**
   - Navigate to `/login`
   - Login with patient credentials
   - You should see the Patient Dashboard

2. **View Lab Report from Dashboard:**
   - On the dashboard, find the **"Latest Lab Result"** card in the sidebar
   - If you have lab reports, you should see:
     - Test name and date
     - Test type
     - Status
     - **"View Full Report"** button
   - Click **"View Full Report"** button
   - The `LabReportViewerModal` should open

3. **View Lab Report from KPI Card:**
   - On the dashboard, find the **"Lab Reports"** KPI card
   - Click the **"View"** link at the bottom
   - If you have reports, the latest one should open in the modal
   - If no reports, you should see a message: "No lab reports available yet."

4. **View Lab Report from Timeline:**
   - On the dashboard, find the **"Care Timeline"** card
   - Filter by "Labs" or "All"
   - Find a lab report entry (should show "Lab Report: [Test Name]")
   - Click **"View Report"** action button
   - The report should open in the modal

5. **Explore the Report Viewer:**
   - The modal should show:
     - **Report Details**: Patient name, test name, test type, report date, status
     - **Status Tag**: Color-coded (green for completed/ready, blue for processing, orange for pending)
     - **Test Results**: Formatted display of results
     - **Normal Ranges**: If available
     - **Notes**: If available
     - **Attached Report**: Link to PDF if `reportUrl` exists
   - Check different statuses:
     - **Pending**: Should show warning alert
     - **Processing**: Should show info alert
     - **Ready/Completed**: Should show full results

6. **Download Report:**
   - In the report viewer modal, click **"Download Report"** button
   - If `reportUrl` exists: PDF should open/download
   - If no `reportUrl`: Text file should download with report details
   - File name should be: `Lab_Report_[TestName]_[Date].txt`

### Expected Results:
- ✅ Report viewer modal opens from all entry points
- ✅ All report details are displayed correctly
- ✅ Status indicators are color-coded
- ✅ Results are formatted and readable
- ✅ Download works for both PDF and text formats
- ✅ Empty states are handled (no reports, no results yet)

### Test Edge Cases:
- Try viewing a report with missing data (should show "N/A")
- Try downloading when no reportUrl (should generate text file)
- Try viewing a report that's still pending (should show appropriate message)

---

## Test 4: Auto-Notifications

### Steps:

1. **Setup:**
   - Login as **Lab Technician**
   - Login as **Patient** (in another browser/incognito window)
   - Login as **Doctor** (in another browser/incognito window)

2. **Trigger Notification:**
   - As **Lab Technician**: Update a lab report status to "ready" or "completed"
   - You can do this via:
     - Inline status dropdown in the table
     - Edit modal and change status
   - The report should have:
     - A `patientId` (patient should receive notification)
     - A `doctorId` (doctor should receive notification if report was requested by doctor)

3. **Check Patient Notifications:**
   - Switch to **Patient** dashboard
   - Look at the **"Notifications"** widget in the sidebar
   - You should see a new notification:
     - Title: "Lab Report Ready"
     - Message: "Your lab test results are now available."
     - Type: "lab_report"
     - Should have a badge indicating unread

4. **Check Doctor Notifications:**
   - Switch to **Doctor** dashboard
   - Look at the **"Notifications"** widget
   - If the report was requested by this doctor, you should see:
     - Title: "Lab Report Ready"
     - Message: "Lab report for [Test Name] is now [status]."
     - Type: "lab_report"

5. **Verify Notification Details:**
   - Click on a notification item
   - It should mark as read (badge should disappear)
   - Notification should link to the related lab report (if implemented)

### Expected Results:
- ✅ Patient receives notification when report status changes to "ready" or "completed"
- ✅ Doctor receives notification if they requested the report
- ✅ Notifications appear in dashboard widgets
- ✅ Unread count updates correctly
- ✅ Notifications can be marked as read

### Test Edge Cases:
- Try updating status multiple times (should only notify on first change to ready/completed)
- Try updating to "ready" then "completed" (should notify twice)
- Try updating a report without doctorId (only patient should be notified)

---

## Test 5: End-to-End Workflow

### Complete Flow Test:

1. **Doctor Requests Test:**
   - Login as Doctor
   - Request a lab test for a patient
   - Note the test name and patient

2. **Lab Technician Processes:**
   - Login as Lab Technician
   - See the request in "Doctor Requests" section
   - Edit the request and add results
   - Update status to "Processing"

3. **Complete the Report:**
   - Update status to "Ready"
   - Verify notifications are sent

4. **Patient Views Report:**
   - Login as Patient
   - Check notifications (should see "Lab Report Ready")
   - View the report from dashboard
   - Download the report

5. **Doctor Views Report:**
   - Login as Doctor
   - Check notifications (should see "Lab Report Ready")
   - View the report in "Lab Results Queue" widget

### Expected Results:
- ✅ Complete workflow functions end-to-end
- ✅ All notifications are sent correctly
- ✅ All users can access their reports
- ✅ Status updates propagate correctly

---

## Common Issues & Troubleshooting

### Issue: Notifications not appearing
- **Check**: Backend console for notification creation logs
- **Check**: Database `notifications` table for entries
- **Check**: User IDs match between reports and notifications

### Issue: Doctor requests not showing
- **Check**: Report has `doctorId` set
- **Check**: Report status is "pending"
- **Check**: Report results contain "Pending - Awaiting lab processing"

### Issue: Download not working
- **Check**: Browser download settings
- **Check**: Console for JavaScript errors
- **Check**: `reportUrl` field in database

### Issue: Status update fails
- **Check**: User has correct role (LAB or DOCTOR)
- **Check**: Report belongs to the lab (for lab technicians)
- **Check**: Backend console for errors

---

## API Endpoints to Test

### Doctor Lab Request:
```bash
POST /api/labs/requests
Headers: Authorization: Bearer <doctor_token>
Body: {
  "patientId": 1,
  "labId": 1,
  "testName": "CBC",
  "testType": "Blood Test",
  "reportDate": "2024-01-15",
  "priority": "normal",
  "notes": "Routine checkup"
}
```

### Update Lab Report Status:
```bash
PATCH /api/labs/reports/:id/status
Headers: Authorization: Bearer <lab_token>
Body: {
  "status": "ready"
}
```

### Get Patient Reports:
```bash
GET /api/labs/patient/reports
Headers: Authorization: Bearer <patient_token>
```

### Get Doctor Reports:
```bash
GET /api/labs/doctor/reports
Headers: Authorization: Bearer <doctor_token>
```

---

## Test Checklist

- [ ] Doctor can create lab request
- [ ] Lab technician sees doctor requests in separate section
- [ ] Lab technician can edit and update reports
- [ ] Status updates work inline
- [ ] Status filter works
- [ ] Patient can view reports from multiple entry points
- [ ] Patient can download reports
- [ ] Notifications sent when status changes to ready/completed
- [ ] Patient receives notifications
- [ ] Doctor receives notifications (if requested report)
- [ ] End-to-end workflow functions correctly

---

## Next Steps After Testing

If all tests pass, you can proceed to:
1. **Phase 3**: Appointment rescheduling features
2. **Enhancements**: 
   - Email/SMS notifications
   - Report sharing
   - Advanced filtering
   - Report templates

