CREATE TABLE "bed_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"encounter_id" integer NOT NULL,
	"bed_id" integer NOT NULL,
	"from_at" timestamp DEFAULT now(),
	"to_at" timestamp,
	"reason" text,
	"transferred_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "beds" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"bed_number" text NOT NULL,
	"bed_name" text,
	"status" text DEFAULT 'available' NOT NULL,
	"bed_type" text,
	"equipment" text,
	"notes" text,
	"last_cleaned_at" timestamp,
	"blocked_reason" text,
	"blocked_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"floor_number" integer NOT NULL,
	"floor_name" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ipd_encounters" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"admitting_doctor_id" integer,
	"attending_doctor_id" integer,
	"admission_type" text NOT NULL,
	"status" text DEFAULT 'admitted' NOT NULL,
	"admitted_at" timestamp DEFAULT now(),
	"discharged_at" timestamp,
	"discharge_summary_text" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "opd_queue_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"appointment_id" integer,
	"patient_id" integer NOT NULL,
	"queue_date" text NOT NULL,
	"token_number" integer NOT NULL,
	"position" integer NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"checked_in_at" timestamp,
	"called_at" timestamp,
	"consultation_started_at" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "opd_queue_entries_doctor_id_queue_date_token_number_unique" UNIQUE("doctor_id","queue_date","token_number"),
	CONSTRAINT "opd_queue_entries_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"ward_id" integer NOT NULL,
	"room_number" text NOT NULL,
	"room_name" text,
	"category" text NOT NULL,
	"capacity" integer,
	"amenities" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"floor_id" integer,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"gender_policy" text,
	"capacity" integer,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
-- Skip rescheduled columns - they already exist from previous migration
DO $$
BEGIN
  -- Only add rescheduled columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'rescheduled_at') THEN
    ALTER TABLE "appointments" ADD COLUMN "rescheduled_at" timestamp;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'rescheduled_from_date') THEN
    ALTER TABLE "appointments" ADD COLUMN "rescheduled_from_date" timestamp;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'rescheduled_from_time_slot') THEN
    ALTER TABLE "appointments" ADD COLUMN "rescheduled_from_time_slot" text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'reschedule_reason') THEN
    ALTER TABLE "appointments" ADD COLUMN "reschedule_reason" text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'rescheduled_by') THEN
    ALTER TABLE "appointments" ADD COLUMN "rescheduled_by" integer;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed_allocations" ADD CONSTRAINT "bed_allocations_transferred_by_users_id_fk" FOREIGN KEY ("transferred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floors" ADD CONSTRAINT "floors_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD CONSTRAINT "ipd_encounters_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD CONSTRAINT "ipd_encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD CONSTRAINT "ipd_encounters_admitting_doctor_id_doctors_id_fk" FOREIGN KEY ("admitting_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD CONSTRAINT "ipd_encounters_attending_doctor_id_doctors_id_fk" FOREIGN KEY ("attending_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opd_queue_entries" ADD CONSTRAINT "opd_queue_entries_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opd_queue_entries" ADD CONSTRAINT "opd_queue_entries_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opd_queue_entries" ADD CONSTRAINT "opd_queue_entries_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opd_queue_entries" ADD CONSTRAINT "opd_queue_entries_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Add rescheduled_by foreign key only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'appointments_rescheduled_by_users_id_fk'
  ) THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_by_users_id_fk" FOREIGN KEY ("rescheduled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;