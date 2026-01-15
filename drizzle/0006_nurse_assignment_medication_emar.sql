-- Migration: Nurse Assignment, Medication Orders, eMAR, and Activity Logs
-- Description: Adds nurse assignment to IPD encounters, medication order system, 
--              medication administration tracking (eMAR), and nurse activity logging

-- 1. Add nurse assignment fields to IPD encounters
ALTER TABLE ipd_encounters 
ADD COLUMN IF NOT EXISTS assigned_nurse_id INTEGER REFERENCES nurses(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ipd_encounters_assigned_nurse ON ipd_encounters(assigned_nurse_id) WHERE assigned_nurse_id IS NOT NULL;

-- 2. Create medication_orders table
CREATE TABLE IF NOT EXISTS medication_orders (
  id SERIAL PRIMARY KEY,
  encounter_id INTEGER REFERENCES ipd_encounters(id) ON DELETE CASCADE NOT NULL,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  ordered_by_doctor_id INTEGER REFERENCES doctors(id) NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  unit TEXT NOT NULL,
  route TEXT NOT NULL, -- oral, IV, IM, SC, topical, etc.
  frequency TEXT NOT NULL, -- QID, TID, BID, Q8H, Q12H, QD, PRN, etc.
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  is_prn BOOLEAN DEFAULT FALSE,
  prn_indication TEXT, -- For PRN medications: "For pain", "For fever", etc.
  status TEXT DEFAULT 'active' NOT NULL, -- active, stopped, completed
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Indexes for medication_orders
CREATE INDEX IF NOT EXISTS idx_medication_orders_encounter ON medication_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_medication_orders_patient ON medication_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_orders_status ON medication_orders(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_medication_orders_doctor ON medication_orders(ordered_by_doctor_id);

-- 3. Create medication_administrations table (eMAR)
CREATE TABLE IF NOT EXISTS medication_administrations (
  id SERIAL PRIMARY KEY,
  medication_order_id INTEGER REFERENCES medication_orders(id) ON DELETE CASCADE NOT NULL,
  encounter_id INTEGER REFERENCES ipd_encounters(id) ON DELETE CASCADE NOT NULL,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  administered_at TIMESTAMP,
  administered_by_user_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, given, missed, held, refused
  dose_given TEXT, -- Actual dose given (may differ from ordered)
  route_used TEXT, -- Route used (may differ from ordered)
  notes TEXT,
  reason TEXT, -- For held/refused/missed: reason why
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Indexes for medication_administrations
CREATE INDEX IF NOT EXISTS idx_med_admin_order ON medication_administrations(medication_order_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_encounter ON medication_administrations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_patient ON medication_administrations(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_scheduled ON medication_administrations(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_med_admin_status ON medication_administrations(status);
CREATE INDEX IF NOT EXISTS idx_med_admin_nurse ON medication_administrations(administered_by_user_id);

-- 4. Create nurse_activity_logs table
CREATE TABLE IF NOT EXISTS nurse_activity_logs (
  id SERIAL PRIMARY KEY,
  encounter_id INTEGER REFERENCES ipd_encounters(id) ON DELETE CASCADE NOT NULL,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  nurse_id INTEGER REFERENCES nurses(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL, -- vitals, medication, note, assessment, care, etc.
  activity_subtype TEXT, -- medication_given, vitals_recorded, note_added, assessment_completed, etc.
  entity_type TEXT, -- vitals_chart, medication_administration, nursing_notes, etc.
  entity_id INTEGER, -- ID of the related entity
  description TEXT NOT NULL,
  metadata JSONB, -- Additional details as JSON
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for nurse_activity_logs
CREATE INDEX IF NOT EXISTS idx_nurse_activity_encounter ON nurse_activity_logs(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nurse_activity_patient ON nurse_activity_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_activity_nurse ON nurse_activity_logs(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_activity_type ON nurse_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_nurse_activity_created ON nurse_activity_logs(created_at DESC);

-- 5. Create nurse_assignments table (for assignment history and multiple nurses per patient)
CREATE TABLE IF NOT EXISTS nurse_assignments (
  id SERIAL PRIMARY KEY,
  encounter_id INTEGER REFERENCES ipd_encounters(id) ON DELETE CASCADE NOT NULL,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  nurse_id INTEGER REFERENCES nurses(id) ON DELETE CASCADE NOT NULL,
  assigned_by_user_id INTEGER REFERENCES users(id) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  unassigned_at TIMESTAMP, -- null if currently assigned
  unassigned_by_user_id INTEGER REFERENCES users(id),
  reason TEXT, -- Assignment reason or unassignment reason
  shift_type TEXT, -- day, night, rotation (optional)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for nurse_assignments
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_encounter ON nurse_assignments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_nurse ON nurse_assignments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_active ON nurse_assignments(nurse_id, encounter_id) WHERE unassigned_at IS NULL;

-- Add comment to tables
COMMENT ON TABLE medication_orders IS 'Medication orders placed by doctors for IPD patients';
COMMENT ON TABLE medication_administrations IS 'eMAR: Medication administration records logged by nurses';
COMMENT ON TABLE nurse_activity_logs IS 'Comprehensive activity log for all nurse operations on patients';
COMMENT ON TABLE nurse_assignments IS 'History of nurse assignments to IPD patients (supports multiple nurses per patient)';




