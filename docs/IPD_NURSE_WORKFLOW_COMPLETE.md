# Complete IPD Nurse Workflow Documentation

## Overview
This document describes the complete IPD nurse workflow where doctors assign patients to nurses, and nurses manage all aspects of patient care with comprehensive activity logging.

## Complete Workflow

### 1. Doctor Assigns Patient to Nurse

**Flow:**
```
Doctor Dashboard → Select IPD Patient → Click "Assign Nurse" 
→ Select Nurse from List → Confirm Assignment
→ System Updates:
  - ipd_encounters.assigned_nurse_id
  - ipd_encounters.assigned_at
  - ipd_encounters.assigned_by_user_id
  - Creates nurse_assignments record
  - Sends notification to nurse
```

**Features:**
- Doctor can see all available nurses in hospital
- Can assign multiple nurses (for shift coverage) via nurse_assignments table
- Assignment history tracked
- Nurse receives notification when assigned

### 2. Nurse Views Assigned Patients

**Flow:**
```
Nurse Dashboard → "My Ward" Tab → Shows:
  - All IPD encounters where assigned_nurse_id = current nurse
  - Active assignments from nurse_assignments table
  - Patient details, bed number, doctor name
  - Quick actions for each patient
```

**Display:**
- Patient name, ID, age
- Bed number and ward
- Attending doctor
- Admission date
- Status (admitted, critical, stable)
- Quick action buttons (Record Vitals, Add Note, View Medications)

### 3. Nurse Records Vitals

**Flow:**
```
Nurse → Select Patient → Click "Record Vitals"
→ Vitals Entry Form Opens
→ Enter: BP, Temperature, Pulse, SpO2, Respiration, Pain Scale, etc.
→ Submit
→ System:
  - Saves to vitals_chart table
  - Creates activity log entry
  - Updates "Vitals Recorded Today" KPI
  - Shows in vitals history
```

**Activity Log Entry:**
```json
{
  "activityType": "vitals",
  "activitySubtype": "vitals_recorded",
  "entityType": "vitals_chart",
  "entityId": <vital_id>,
  "description": "Recorded vitals for [Patient Name]",
  "metadata": {
    "bp": "120/80",
    "temperature": "98.6",
    "pulse": "72"
  }
}
```

### 4. Nurse Writes Nursing Notes

**Flow:**
```
Nurse → Select Patient → Click "Add Nursing Note"
→ Note Entry Form Opens
→ Select Note Type: Assessment, Care Plan, Shift Handover, General
→ Enter Notes
→ Submit
→ System:
  - Saves to nursing_notes table
  - Creates activity log entry
  - Shows in nursing notes history
```

**Activity Log Entry:**
```json
{
  "activityType": "note",
  "activitySubtype": "note_added",
  "entityType": "nursing_notes",
  "entityId": <note_id>,
  "description": "Added [note_type] note for [Patient Name]"
}
```

### 5. Doctor Creates Medication Order

**Flow:**
```
Doctor Dashboard → Select IPD Patient → "Medications" Tab
→ Click "Add Medication Order"
→ Form:
  - Medication Name
  - Dosage (e.g., "500mg")
  - Unit (e.g., "mg", "ml", "tablets")
  - Route (oral, IV, IM, SC, topical)
  - Frequency (QID, TID, BID, Q8H, Q12H, QD, PRN)
  - Start Date
  - End Date (optional)
  - PRN Indication (if PRN)
  - Notes
→ Submit
→ System:
  - Creates medication_order record
  - Generates medication schedule (scheduled administrations)
  - Creates medication_administrations records for each scheduled dose
  - Sends notification to assigned nurse
```

**Medication Schedule Generation:**
- QID (4 times daily): 8 AM, 12 PM, 6 PM, 10 PM
- TID (3 times daily): 8 AM, 2 PM, 8 PM
- BID (2 times daily): 8 AM, 8 PM
- Q8H (Every 8 hours): 8 AM, 4 PM, 12 AM
- Q12H (Every 12 hours): 8 AM, 8 PM
- QD (Once daily): 8 AM
- PRN: No automatic schedule, nurse creates when needed

### 6. Nurse Views Medication Schedule

**Flow:**
```
Nurse → Select Patient → "Medications" Tab
→ Shows Medication Schedule:
  - Today's scheduled medications
  - Upcoming medications (next 24 hours)
  - Past medications (last 7 days)
  - PRN medications available
  - Status indicators: Scheduled, Given, Missed, Held, Refused
```

**Display Format:**
- Time-based grid (like eMAR)
- Color coding:
  - Green: Given
  - Yellow: Scheduled (upcoming)
  - Red: Missed
  - Orange: Held
  - Gray: Refused

### 7. Nurse Administers Medication

**Flow:**
```
Nurse → Medication Schedule → Click on Scheduled Medication
→ Medication Administration Modal Opens
→ Shows:
  - Medication name, dosage, route
  - Scheduled time
  - Patient name
→ Options:
  - Mark as "Given" (with actual time, dose, route)
  - Mark as "Held" (with reason)
  - Mark as "Refused" (with reason)
  - Mark as "Missed" (with reason)
→ Submit
→ System:
  - Updates medication_administrations record
  - Creates activity log entry
  - Updates medication schedule display
  - Clears reminder if given
```

**Activity Log Entry:**
```json
{
  "activityType": "medication",
  "activitySubtype": "medication_given",
  "entityType": "medication_administration",
  "entityId": <admin_id>,
  "description": "Administered [Medication Name] [Dosage] via [Route] to [Patient Name]",
  "metadata": {
    "medication": "Paracetamol",
    "dose": "500mg",
    "route": "oral",
    "scheduledTime": "2025-01-15T08:00:00Z",
    "administeredTime": "2025-01-15T08:05:00Z"
  }
}
```

### 8. Medication Reminders

**Flow:**
```
System → Checks upcoming medications (30 minutes before scheduled time)
→ If medication not yet given:
  - Creates notification for nurse
  - Shows in nurse dashboard
  - Can set reminder_sent_at timestamp
→ Nurse sees reminder:
  - Patient name
  - Medication name and dosage
  - Scheduled time
  - Time remaining
→ Nurse can:
  - Mark as given (opens administration modal)
  - Snooze reminder (5, 10, 15 minutes)
  - Dismiss reminder
```

**Reminder Logic:**
- Check every 5 minutes for medications due in next 30 minutes
- Send reminder 30 minutes before scheduled time
- Send another reminder at scheduled time if not given
- Mark as "missed" if 1 hour past scheduled time and not given

### 9. Activity Log Timeline

**Flow:**
```
Nurse → Select Patient → "Activity Log" Tab
→ Shows Timeline View:
  - All activities chronologically
  - Grouped by date
  - Filter by activity type
  - Search functionality
```

**Activity Types Logged:**
1. **Vitals Recorded**
   - When: Every time vitals are recorded
   - Details: BP, temp, pulse, etc.

2. **Medication Given**
   - When: Medication marked as given
   - Details: Medication name, dose, route, time

3. **Medication Held/Refused/Missed**
   - When: Medication status changed
   - Details: Reason, medication name

4. **Nursing Note Added**
   - When: Note is created
   - Details: Note type, summary

5. **Patient Assessment**
   - When: Assessment completed
   - Details: Assessment findings

6. **Care Plan Updated**
   - When: Care plan modified
   - Details: Changes made

### 10. View Doctor Prescriptions/Orders

**Flow:**
```
Nurse → Select Patient → "Prescriptions" Tab
→ Shows:
  - All active medication orders
  - Past medication orders
  - Prescription details:
    - Medication name
    - Dosage and frequency
    - Route
    - Start/end dates
    - Doctor name
    - Order date
```

## Database Tables

### 1. `ipd_encounters` (Updated)
- `assigned_nurse_id` - Primary assigned nurse
- `assigned_at` - When assigned
- `assigned_by_user_id` - Who assigned

### 2. `nurse_assignments` (New)
- Tracks assignment history
- Supports multiple nurses per patient
- Tracks shift assignments

### 3. `medication_orders` (New)
- Doctor medication orders
- Contains medication details, frequency, route
- Status: active, stopped, completed

### 4. `medication_administrations` (New)
- eMAR records
- Each scheduled dose
- Status: scheduled, given, missed, held, refused

### 5. `nurse_activity_logs` (New)
- Comprehensive activity tracking
- All nurse operations
- Patient-wise timeline

## API Endpoints

### Doctor Endpoints
- `POST /api/ipd/encounters/:encounterId/assign-nurse` - Assign nurse
- `POST /api/ipd/encounters/:encounterId/medication-orders` - Create medication order
- `GET /api/ipd/encounters/:encounterId/medication-orders` - Get orders
- `PATCH /api/ipd/medication-orders/:orderId/stop` - Stop order

### Nurse Endpoints
- `GET /api/nurses/my-patients` - Get assigned patients
- `GET /api/ipd/encounters/:encounterId/medication-schedule` - Get schedule
- `POST /api/ipd/medication-administrations` - Mark medication as given
- `PATCH /api/ipd/medication-administrations/:id` - Update status
- `GET /api/ipd/encounters/:encounterId/activity-log` - Get activity log
- `GET /api/nurses/medication-reminders` - Get upcoming reminders

## UI Components Needed

### Nurse Dashboard
1. **Assigned Patients List**
   - Patient cards with quick actions
   - Filter by status, ward, doctor

2. **Medication Schedule Widget**
   - Today's medications
   - Upcoming medications
   - Status indicators

3. **Medication Administration Modal**
   - Medication details
   - Status selection (given/held/refused/missed)
   - Time picker
   - Reason field (for held/refused/missed)

4. **Activity Timeline Component**
   - Chronological list
   - Grouped by date
   - Filter and search
   - Expandable details

5. **Reminder Notifications**
   - Popup notifications
   - Dashboard badge
   - Quick action buttons

### Doctor Dashboard
1. **Assign Nurse Modal**
   - Patient info
   - Nurse selection dropdown
   - Assignment reason

2. **Medication Order Form**
   - Medication details
   - Frequency selection
   - Route selection
   - Date range

## Implementation Status

### ✅ Completed
- Database migration file created
- Schema updated with new tables
- Implementation plan documented

### 🔄 In Progress
- Backend services (next step)
- API endpoints (next step)

### ⏳ Pending
- Frontend components
- Reminder system
- Notifications

## Next Steps

1. **Run Migration**: Execute `drizzle/0006_nurse_assignment_medication_emar.sql`
2. **Create Backend Services**:
   - `server/services/nurse-assignment.service.ts`
   - `server/services/medication-order.service.ts`
   - `server/services/medication-administration.service.ts`
   - `server/services/nurse-activity.service.ts`
3. **Create API Routes**:
   - `server/routes/ipd.routes.ts` (add assignment endpoints)
   - `server/routes/medication.routes.ts` (new file)
4. **Update Nurse Dashboard**:
   - Show assigned patients
   - Medication schedule view
   - Administration interface
   - Activity log view
5. **Update Doctor Dashboard**:
   - Assign nurse feature
   - Medication order form

## Testing Checklist

- [ ] Doctor can assign nurse to IPD patient
- [ ] Nurse sees assigned patients in dashboard
- [ ] Nurse can record vitals (already working)
- [ ] Nurse can add nursing notes (already working)
- [ ] Doctor can create medication order
- [ ] Medication schedule is generated correctly
- [ ] Nurse can mark medication as given
- [ ] Activity log captures all operations
- [ ] Reminders work correctly
- [ ] Multiple nurses can be assigned to same patient
- [ ] Activity timeline shows all operations chronologically




