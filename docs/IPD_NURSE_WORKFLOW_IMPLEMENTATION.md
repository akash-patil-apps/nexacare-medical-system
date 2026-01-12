# IPD Nurse Workflow Implementation Plan

## Overview
This document outlines the complete implementation plan for the IPD nurse workflow where doctors assign patients to nurses, and nurses manage all aspects of patient care including vitals, notes, medication administration, and activity logging.

## Workflow Requirements

### 1. Doctor Assigns Patients to Nurses
- Doctor can assign IPD patients to specific nurses
- Multiple nurses can be assigned to one patient (for shift coverage)
- Assignment history tracking
- Notification to nurse when assigned

### 2. Nurse Dashboard Features
- View assigned patients
- Record vitals
- Write nursing notes
- View doctor prescriptions/orders
- Medication administration tracking (eMAR)
- Medication reminders
- Activity log for all operations

### 3. Medication Administration (eMAR)
- View scheduled medications from doctor orders
- Mark medications as given (with time, route, dose)
- Mark as missed/held/refused with reason
- Set reminders for upcoming medications
- Track PRN (as-needed) medications
- Log injections, IV medications, oral medications

### 4. Activity Logging
- Log all vitals recordings
- Log all medication administrations
- Log all nursing notes
- Log all patient interactions
- Patient-wise activity timeline

## Database Schema Changes

### 1. Add Nurse Assignment to IPD Encounters
```sql
ALTER TABLE ipd_encounters 
ADD COLUMN assigned_nurse_id INTEGER REFERENCES nurses(id),
ADD COLUMN assigned_at TIMESTAMP,
ADD COLUMN assigned_by_user_id INTEGER REFERENCES users(id);
```

### 2. Create Medication Orders Table
```sql
CREATE TABLE medication_orders (
  id SERIAL PRIMARY KEY,
  encounter_id INTEGER REFERENCES ipd_encounters(id) NOT NULL,
  patient_id INTEGER REFERENCES patients(id) NOT NULL,
  ordered_by_doctor_id INTEGER REFERENCES doctors(id) NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  unit TEXT NOT NULL,
  route TEXT NOT NULL, -- oral, IV, IM, SC, etc.
  frequency TEXT NOT NULL, -- QID, TID, BID, Q8H, etc.
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  is_prn BOOLEAN DEFAULT FALSE,
  prn_indication TEXT,
  status TEXT DEFAULT 'active', -- active, stopped, completed
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

### 3. Create Medication Administration Table
```sql
CREATE TABLE medication_administrations (
  id SERIAL PRIMARY KEY,
  medication_order_id INTEGER REFERENCES medication_orders(id) NOT NULL,
  encounter_id INTEGER REFERENCES ipd_encounters(id) NOT NULL,
  patient_id INTEGER REFERENCES patients(id) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  administered_at TIMESTAMP,
  administered_by_user_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL, -- scheduled, given, missed, held, refused
  dose_given TEXT,
  route_used TEXT,
  notes TEXT,
  reason TEXT, -- for held/refused/missed
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Create Nurse Activity Log Table
```sql
CREATE TABLE nurse_activity_logs (
  id SERIAL PRIMARY KEY,
  encounter_id INTEGER REFERENCES ipd_encounters(id) NOT NULL,
  patient_id INTEGER REFERENCES patients(id) NOT NULL,
  nurse_id INTEGER REFERENCES nurses(id) NOT NULL,
  activity_type TEXT NOT NULL, -- vitals, medication, note, assessment, etc.
  activity_subtype TEXT, -- medication_given, vitals_recorded, note_added, etc.
  entity_type TEXT, -- vitals_chart, medication_administration, nursing_notes, etc.
  entity_id INTEGER,
  description TEXT NOT NULL,
  metadata JSONB, -- Additional details
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Doctor Endpoints
1. `POST /api/ipd/encounters/:encounterId/assign-nurse` - Assign nurse to patient
2. `POST /api/ipd/encounters/:encounterId/medication-orders` - Create medication order
3. `GET /api/ipd/encounters/:encounterId/medication-orders` - Get medication orders
4. `PATCH /api/ipd/medication-orders/:orderId/stop` - Stop medication order

### Nurse Endpoints
1. `GET /api/nurses/my-patients` - Get assigned patients
2. `POST /api/ipd/encounters/:encounterId/vitals` - Record vitals (already exists, enhance)
3. `POST /api/ipd/encounters/:encounterId/nursing-notes` - Add nursing note (already exists)
4. `GET /api/ipd/encounters/:encounterId/prescriptions` - Get prescriptions/orders
5. `GET /api/ipd/encounters/:encounterId/medication-schedule` - Get medication schedule
6. `POST /api/ipd/medication-administrations` - Mark medication as given
7. `PATCH /api/ipd/medication-administrations/:id` - Update administration status
8. `GET /api/ipd/encounters/:encounterId/activity-log` - Get activity log
9. `GET /api/nurses/medication-reminders` - Get upcoming medication reminders

## Implementation Steps

### Phase 1: Database Schema (Priority 1)
1. Create migration for nurse assignment
2. Create medication_orders table
3. Create medication_administrations table
4. Create nurse_activity_logs table

### Phase 2: Backend Services (Priority 1)
1. Nurse assignment service
2. Medication order service
3. Medication administration service
4. Activity logging service
5. Reminder service

### Phase 3: API Routes (Priority 1)
1. Doctor assignment endpoints
2. Medication order endpoints
3. Medication administration endpoints
4. Activity log endpoints
5. Reminder endpoints

### Phase 4: Frontend - Doctor Dashboard (Priority 2)
1. Patient assignment UI
2. Medication order entry form
3. View assigned nurses

### Phase 5: Frontend - Nurse Dashboard (Priority 1)
1. Assigned patients list
2. Medication schedule view
3. Medication administration interface
4. Activity log view
5. Reminder notifications

### Phase 6: Reminders & Notifications (Priority 2)
1. Medication reminder system
2. Push notifications for reminders
3. Email/SMS notifications (optional)

## UI Components Needed

### Doctor Dashboard
- Assign Nurse Modal
- Medication Order Form
- Patient Assignment List

### Nurse Dashboard
- Assigned Patients Card
- Medication Schedule Widget
- Medication Administration Modal
- Quick Actions for each patient
- Activity Timeline View
- Reminder Notifications

## Data Flow

### Assignment Flow
```
Doctor → Select Patient → Assign Nurse → Notification to Nurse → Nurse sees in "My Patients"
```

### Medication Flow
```
Doctor → Create Medication Order → System generates schedule → Nurse sees in schedule
Nurse → Mark as given → Logs administration → Updates activity log → Reminder cleared
```

### Activity Logging Flow
```
Nurse Action → Service logs activity → Saved to nurse_activity_logs → Displayed in timeline
```

## Next Steps
1. Create database migrations
2. Implement backend services
3. Create API endpoints
4. Update nurse dashboard UI
5. Add medication administration interface
6. Implement reminder system


