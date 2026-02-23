-- Patient reminder alarm times (morning/noon/afternoon/night) and medicine adherence (taken/skipped)
CREATE TABLE IF NOT EXISTS "patient_reminder_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "patient_id" integer NOT NULL UNIQUE,
  "morning_time" text DEFAULT '09:00',
  "noon_time" text DEFAULT '12:00',
  "afternoon_time" text DEFAULT '14:00',
  "night_time" text DEFAULT '20:00',
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone
);

ALTER TABLE "patient_reminder_settings"
  ADD CONSTRAINT "patient_reminder_settings_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

CREATE TABLE IF NOT EXISTS "medicine_adherence" (
  "id" serial PRIMARY KEY NOT NULL,
  "patient_id" integer NOT NULL,
  "prescription_id" integer NOT NULL,
  "medication_name" text NOT NULL,
  "scheduled_date" timestamp with time zone NOT NULL,
  "scheduled_time" text NOT NULL,
  "status" text NOT NULL,
  "taken_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "medicine_adherence"
  ADD CONSTRAINT "medicine_adherence_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "medicine_adherence"
  ADD CONSTRAINT "medicine_adherence_prescription_id_prescriptions_id_fk"
  FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
