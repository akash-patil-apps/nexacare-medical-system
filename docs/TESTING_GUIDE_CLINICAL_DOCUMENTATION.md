# Manual Testing Guide: Clinical Documentation & EMR

## Overview
This guide provides step-by-step instructions for manually testing the Clinical Documentation & EMR features, including:
- Clinical Notes (SOAP notes, admission notes, consultation notes)
- Vitals Charting
- Nursing Notes
- Integration with Doctor Dashboard

---

## Prerequisites

### Test Accounts Needed
1. **Doctor Account** - To create clinical notes and record vitals
2. **Patient Account** - To have appointments/encounters for documentation
3. **Hospital Admin Account** - (Optional) For diagnosis codes management

### Test Data Setup
- At least one patient with an appointment or IPD encounter
- Hospital ID should be accessible

---

## Test Scenario 1: Create Clinical Note (SOAP Format)

### Objective
Test creating a progress note using SOAP format during a consultation.

### Steps

1. **Login as Doctor**
   - Navigate to login page
   - Use doctor credentials
   - Verify successful login and dashboard loads

2. **Open Patient Information**
   - Go to "Appointments" tab in doctor dashboard
   - Find a patient appointment (or use "View Patient Info" button)
   - Click on patient name or "View Info" button
   - Patient Info Drawer should open on the right

3. **Access Clinical Documentation**
   - In the Patient Info Drawer, scroll to "Clinical Documentation" section
   - Verify you see two tabs: "Clinical Notes" and "Vitals"
   - Click "Add Note" button (top right of Clinical Documentation card)

4. **Create SOAP Note**
   - Clinical Notes Editor modal should open
   - Select "Note Type": "Progress Note (SOAP)"
   - Fill in the SOAP format:
     - **Subjective (S)**: Enter patient complaints
       - Example: "Patient reports chest pain for 2 days, worsening with activity"
     - **Objective (O)**: Enter exam findings
       - Example: "BP: 140/90, Pulse: 88, Heart sounds normal, no murmurs"
     - **Assessment (A)**: Enter diagnosis
       - Example: "Hypertension, stable. Rule out cardiac event."
     - **Plan (P)**: Enter treatment plan
       - Example: "Continue current medications. Order ECG. Follow-up in 1 week."
   - Switch to "History" tab and fill optional fields:
     - Allergies: "Penicillin"
     - Current Medications: "Amlodipine 5mg daily"
     - Past Medical History: "Hypertension x 5 years"
   - Select "Final (Ready to Sign)" from draft dropdown
   - Click "Save Note"

5. **Verify Note Creation**
   - Modal should close
   - Success message: "Clinical note created successfully"
   - In Patient Info Drawer, "Clinical Documentation" section should refresh
   - "Clinical Notes" tab should show count increased
   - New note should appear in the list with:
     - Note type: "progress"
     - Status: "Signed" (green tag)
     - Date and time of creation
     - Assessment preview

### Expected Results
✅ Clinical note saved successfully  
✅ Note appears in Clinical Notes list  
✅ Note is marked as "Signed" (not draft)  
✅ All SOAP sections are saved correctly  

### Database Verification (Optional)
```sql
SELECT * FROM clinical_notes 
WHERE patient_id = <patient_id> 
ORDER BY created_at DESC 
LIMIT 1;
```
Should show the note with all fields populated.

---

## Test Scenario 2: Create Admission Note

### Objective
Test creating an admission note for an IPD patient.

### Steps

1. **Login as Doctor**
   - Use doctor credentials

2. **Open Patient with IPD Encounter**
   - Navigate to patient with an active IPD encounter
   - Open Patient Info Drawer

3. **Create Admission Note**
   - Click "Add Note" in Clinical Documentation section
   - Select "Note Type": "Admission Note"
   - Fill in admission details:
     - **Chief Complaint**: "Severe abdominal pain"
     - **History of Present Illness**: "Patient reports sudden onset of severe abdominal pain 6 hours ago, associated with nausea and vomiting"
     - **Admission Diagnosis**: "Acute appendicitis"
     - **Physical Examination**: "Tenderness in right lower quadrant, positive McBurney's sign, guarding present"
     - **Review of Systems**: "No fever, no urinary symptoms"
   - Fill History tab:
     - Allergies: "None known"
     - Medications: "None"
     - Past Medical History: "No significant past medical history"
   - Select "Final (Ready to Sign)"
   - Click "Save Note"

4. **Sign the Note**
   - After saving, note should appear in list
   - If note is draft, click "Sign Note" button (if available)
   - Or note should be auto-signed if "Final" was selected

### Expected Results
✅ Admission note created with all fields  
✅ Note linked to IPD encounter  
✅ Note appears in Clinical Notes list  
✅ Note is signed and finalized  

---

## Test Scenario 3: Record Vitals

### Objective
Test recording patient vital signs.

### Steps

1. **Login as Doctor**
   - Use doctor credentials

2. **Open Patient Information**
   - Navigate to patient
   - Open Patient Info Drawer

3. **Record Vitals**
   - In Clinical Documentation section, click "Record Vitals" button
   - Vitals Entry Form modal should open

4. **Enter Vital Signs**
   - **Temperature**: Enter `37.2` (°C)
   - **BP Systolic**: Enter `120`
   - **BP Diastolic**: Enter `80`
   - **Pulse**: Enter `72`
   - **Respiration Rate**: Enter `16`
   - **SpO2**: Enter `98`
   - **Pain Scale**: Enter `2` (0-10)
   - **Weight**: Enter `70` (kg)
   - **Height**: Enter `170` (cm)
   - **BMI**: Should auto-calculate to `24.22` when you blur weight/height fields
   - **Blood Glucose**: Enter `95` (mg/dL)
   - **GCS**: Enter `15` (if applicable)
   - **Urine Output**: Enter `500` (ml)
   - **Notes**: "Patient stable, vitals within normal range"
   - Click "Record Vitals"

5. **Verify Vitals Recording**
   - Modal should close
   - Success message: "Vitals recorded successfully"
   - Switch to "Vitals" tab in Clinical Documentation section
   - New vitals entry should appear showing:
     - Temperature, BP, Pulse, SpO2
     - Date and time of recording
   - Vitals count should increase

6. **Record Multiple Vitals (Trend)**
   - Record vitals again with different values
   - Verify multiple entries appear in chronological order (newest first)
   - Verify you can see vitals trends over time

### Expected Results
✅ Vitals saved successfully  
✅ BMI auto-calculated correctly  
✅ Vitals appear in Vitals tab  
✅ Multiple vitals entries show trend  
✅ All vital signs fields are saved  

### Database Verification (Optional)
```sql
SELECT * FROM vitals_chart 
WHERE patient_id = <patient_id> 
ORDER BY recorded_at DESC 
LIMIT 5;
```
Should show recent vitals entries with all values.

---

## Test Scenario 4: Edit Clinical Note (Draft)

### Objective
Test editing a draft clinical note.

### Steps

1. **Create Draft Note**
   - Create a clinical note
   - Select "Draft" instead of "Final"
   - Save the note

2. **Verify Draft Status**
   - Note should appear with "Draft" tag (orange)
   - Note should not be signed

3. **Edit Draft Note** (If edit functionality is available)
   - Click on the draft note (if clickable)
   - Or use edit button if available
   - Modify the note content
   - Save changes

4. **Finalize Draft**
   - Open the draft note
   - Change to "Final (Ready to Sign)"
   - Click "Sign Note" or save
   - Verify note status changes to "Signed"

### Expected Results
✅ Draft notes are marked correctly  
✅ Draft notes can be edited  
✅ Draft notes can be finalized and signed  

---

## Test Scenario 5: View Clinical Notes History

### Objective
Test viewing all clinical notes for a patient.

### Steps

1. **Login as Doctor**
   - Use doctor credentials

2. **Open Patient with Multiple Notes**
   - Open patient who has multiple clinical notes
   - Open Patient Info Drawer

3. **View Clinical Notes Tab**
   - In Clinical Documentation section, click "Clinical Notes" tab
   - Verify all notes are listed
   - Verify notes are sorted by date (newest first)
   - Verify each note shows:
     - Note type
     - Status (Draft/Signed)
     - Date and time
     - Assessment preview (if available)

4. **View Vitals History**
   - Click "Vitals" tab
   - Verify all vitals entries are listed
   - Verify entries are sorted by date (newest first)
   - Verify each entry shows key vitals (Temp, BP, Pulse, SpO2)
   - Verify date and time are displayed

### Expected Results
✅ All notes are displayed  
✅ Notes are sorted chronologically  
✅ Note details are visible  
✅ Vitals history is displayed correctly  

---

## Test Scenario 6: Create Nursing Note (For Nurses)

### Objective
Test creating nursing notes (requires nurse role or doctor can test).

### Steps

1. **Login as Doctor/Nurse**
   - Use appropriate credentials

2. **Open Patient with IPD Encounter**
   - Navigate to patient with active IPD encounter
   - Note: Nursing notes require `encounterId`

3. **Create Nursing Note** (If UI is available)
   - Access nursing notes interface
   - Select note type:
     - General Note
     - Assessment
     - Care Plan
     - Shift Handover
   - Fill in relevant fields:
     - **Nursing Assessment**: "Patient alert and oriented, pain controlled"
     - **Care Plan**: "Monitor vitals q4h, assist with ambulation"
     - **Interventions**: "Administered pain medication, assisted with positioning"
     - **Evaluation**: "Patient comfortable, vitals stable"
   - Save the note

### Expected Results
✅ Nursing note created successfully  
✅ Note linked to IPD encounter  
✅ Note appears in nursing notes list  

### API Testing (If UI not available)
```bash
POST /api/clinical/nursing-notes
Headers: Authorization: Bearer <token>
Body: {
  "hospitalId": <hospital_id>,
  "patientId": <patient_id>,
  "encounterId": <encounter_id>,
  "noteType": "general",
  "notes": "Patient stable, vitals normal"
}
```

---

## Test Scenario 7: Search Diagnosis Codes

### Objective
Test searching for ICD-10 diagnosis codes.

### Steps

1. **Login as Doctor**
   - Use doctor credentials

2. **Access Diagnosis Codes** (If UI available)
   - In Clinical Notes Editor, if diagnosis code search is available
   - Or via API endpoint

3. **Search Codes**
   - Search for "hypertension"
   - Verify relevant codes appear (e.g., I10, I11, etc.)
   - Search for "diabetes"
   - Verify diabetes codes appear (e.g., E11.9, etc.)

### API Testing
```bash
GET /api/clinical/diagnosis-codes?search=hypertension
Headers: Authorization: Bearer <token>
```

### Expected Results
✅ Diagnosis codes are searchable  
✅ Search returns relevant results  
✅ Codes include description and category  

---

## Test Scenario 8: Link Clinical Note to Appointment

### Objective
Test creating a clinical note linked to a specific appointment.

### Steps

1. **Login as Doctor**
   - Use doctor credentials

2. **Open Appointment**
   - Go to "Appointments" tab
   - Find a specific appointment
   - Open patient info from that appointment

3. **Create Note from Appointment**
   - Click "Add Note"
   - Create a consultation note
   - Save the note

4. **Verify Linkage**
   - Note should be linked to the appointment
   - In database, `appointmentId` should be set

### Expected Results
✅ Note is linked to appointment  
✅ `appointmentId` is saved correctly  
✅ Note appears when viewing appointment details  

---

## Test Scenario 9: Link Clinical Note to IPD Encounter

### Objective
Test creating a clinical note linked to an IPD encounter.

### Steps

1. **Login as Doctor**
   - Use doctor credentials

2. **Open IPD Patient**
   - Navigate to patient with active IPD encounter
   - Open Patient Info Drawer

3. **Create Note for IPD**
   - Click "Add Note"
   - Create a progress note or admission note
   - Save the note

4. **Verify Linkage**
   - Note should be linked to IPD encounter
   - In database, `encounterId` should be set

### Expected Results
✅ Note is linked to IPD encounter  
✅ `encounterId` is saved correctly  
✅ Note appears in IPD encounter documentation  

---

## Test Scenario 10: Error Handling

### Objective
Test error handling and validation.

### Steps

1. **Test Missing Required Fields**
   - Try to save clinical note without noteType
   - Verify error message appears
   - Try to save vitals without patientId
   - Verify error message appears

2. **Test Invalid Data**
   - Enter invalid temperature (e.g., 50°C)
   - Enter invalid BP (e.g., 300/200)
   - Verify validation errors appear

3. **Test Unauthorized Access**
   - Try to access clinical notes without authentication
   - Verify 401 error

4. **Test Non-existent Patient**
   - Try to create note for non-existent patient
   - Verify appropriate error message

### Expected Results
✅ Validation errors are shown  
✅ Unauthorized access is blocked  
✅ Clear error messages are displayed  

---

## Test Scenario 11: Vitals Trends Visualization

### Objective
Test viewing vitals trends over time.

### Steps

1. **Record Multiple Vitals**
   - Record vitals for same patient multiple times
   - Use different values to show trends
   - Record at different times/dates

2. **View Vitals History**
   - Open Patient Info Drawer
   - Go to "Vitals" tab
   - Verify all entries are listed
   - Verify chronological order (newest first)

3. **Analyze Trends**
   - Check if BP values show trend
   - Check if temperature shows trend
   - Verify dates are correct

### Expected Results
✅ Multiple vitals entries are displayed  
✅ Entries are sorted by date  
✅ Trends can be observed  
✅ All vitals values are preserved  

---

## Common Issues & Troubleshooting

### Issue 1: Clinical Notes Not Appearing
**Symptoms**: Notes created but not showing in list  
**Solutions**:
- Check if `patientId` is correct
- Verify API response in browser DevTools
- Check database for note existence
- Refresh the page

### Issue 2: Vitals Not Saving
**Symptoms**: Vitals form submits but data not saved  
**Solutions**:
- Check hospital ID is available
- Verify all required fields are filled
- Check API response for errors
- Verify database connection

### Issue 3: BMI Not Calculating
**Symptoms**: BMI field remains empty after entering weight/height  
**Solutions**:
- Ensure both weight and height are entered
- Blur the fields (click outside) to trigger calculation
- Check if values are valid numbers

### Issue 4: Note Signing Fails
**Symptoms**: Cannot sign clinical note  
**Solutions**:
- Verify user has permission to sign
- Check if note is already signed
- Verify user ID is correct
- Check API response for errors

---

## Database Verification Queries

### Check Clinical Notes
```sql
-- Get all clinical notes for a patient
SELECT 
  cn.id,
  cn.note_type,
  cn.chief_complaint,
  cn.subjective,
  cn.objective,
  cn.assessment,
  cn.plan,
  cn.is_draft,
  cn.signed_at,
  cn.created_at,
  u.full_name as created_by
FROM clinical_notes cn
JOIN users u ON cn.created_by_user_id = u.id
WHERE cn.patient_id = <patient_id>
ORDER BY cn.created_at DESC;
```

### Check Vitals
```sql
-- Get all vitals for a patient
SELECT 
  vc.id,
  vc.temperature,
  vc.bp_systolic,
  vc.bp_diastolic,
  vc.pulse,
  vc.respiration_rate,
  vc.spo2,
  vc.weight,
  vc.height,
  vc.bmi,
  vc.recorded_at,
  u.full_name as recorded_by
FROM vitals_chart vc
JOIN users u ON vc.recorded_by_user_id = u.id
WHERE vc.patient_id = <patient_id>
ORDER BY vc.recorded_at DESC;
```

### Check Nursing Notes
```sql
-- Get all nursing notes for an encounter
SELECT 
  nn.id,
  nn.note_type,
  nn.nursing_assessment,
  nn.care_plan,
  nn.interventions,
  nn.shift_type,
  nn.created_at,
  u.full_name as created_by
FROM nursing_notes nn
JOIN users u ON nn.created_by_user_id = u.id
WHERE nn.encounter_id = <encounter_id>
ORDER BY nn.created_at DESC;
```

---

## Test Checklist

### Clinical Notes
- [ ] Create SOAP note (progress note)
- [ ] Create admission note
- [ ] Create consultation note
- [ ] Create draft note
- [ ] Edit draft note
- [ ] Sign note
- [ ] View notes list
- [ ] Link note to appointment
- [ ] Link note to IPD encounter

### Vitals
- [ ] Record complete vitals
- [ ] Record partial vitals
- [ ] Auto-calculate BMI
- [ ] View vitals history
- [ ] View vitals trends
- [ ] Record multiple vitals entries

### Nursing Notes
- [ ] Create general nursing note
- [ ] Create assessment note
- [ ] Create care plan note
- [ ] Create shift handover note
- [ ] View nursing notes list

### Integration
- [ ] Clinical Documentation appears in Patient Info Drawer
- [ ] Notes appear in correct tabs
- [ ] Vitals appear in correct tab
- [ ] Buttons work correctly
- [ ] Data refreshes after creation

### Error Handling
- [ ] Validation errors work
- [ ] Unauthorized access blocked
- [ ] Clear error messages
- [ ] Network errors handled

---

## Success Criteria

✅ All test scenarios pass  
✅ No console errors  
✅ Data persists in database  
✅ UI is responsive and user-friendly  
✅ Error messages are clear  
✅ Integration with patient info works  
✅ Notes can be created, viewed, and signed  
✅ Vitals can be recorded and viewed  
✅ Multiple entries show trends correctly  

---

## Notes

- **Performance**: If testing with large datasets, verify performance is acceptable
- **Mobile**: Test on mobile devices if applicable
- **Browser**: Test on multiple browsers (Chrome, Firefox, Safari)
- **Permissions**: Verify role-based access control works correctly
- **Audit**: Check if audit logs are created for clinical note actions

---

## Next Steps After Testing

1. **Report Issues**: Document any bugs or issues found
2. **Performance Testing**: Test with large datasets
3. **User Acceptance**: Get feedback from actual doctors/nurses
4. **Documentation**: Update user documentation if needed
5. **Training**: Prepare training materials for end users

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0  
**Author**: Development Team







