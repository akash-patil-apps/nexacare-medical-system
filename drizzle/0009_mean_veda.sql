CREATE TABLE "clinical_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"appointment_id" integer,
	"note_type" text NOT NULL,
	"chief_complaint" text,
	"history_of_present_illness" text,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"admission_diagnosis" text,
	"physical_examination" text,
	"review_of_systems" text,
	"allergies" text,
	"medications" text,
	"past_medical_history" text,
	"family_history" text,
	"social_history" text,
	"created_by_user_id" integer NOT NULL,
	"signed_by_user_id" integer,
	"signed_at" timestamp,
	"is_draft" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "diagnosis_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "diagnosis_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "nursing_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer NOT NULL,
	"note_type" text NOT NULL,
	"nursing_assessment" text,
	"care_plan" text,
	"interventions" text,
	"evaluation" text,
	"shift_type" text,
	"handover_notes" text,
	"critical_information" text,
	"outstanding_tasks" text,
	"notes" text,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vitals_chart" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"appointment_id" integer,
	"temperature" numeric(4, 2),
	"temperature_unit" text DEFAULT 'C',
	"bp_systolic" integer,
	"bp_diastolic" integer,
	"pulse" integer,
	"respiration_rate" integer,
	"spo2" integer,
	"pain_scale" integer,
	"weight" numeric(5, 2),
	"height" numeric(5, 2),
	"bmi" numeric(4, 2),
	"blood_glucose" numeric(5, 2),
	"gcs" integer,
	"urine_output" numeric(6, 2),
	"recorded_by_user_id" integer NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_signed_by_user_id_users_id_fk" FOREIGN KEY ("signed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursing_notes" ADD CONSTRAINT "nursing_notes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals_chart" ADD CONSTRAINT "vitals_chart_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals_chart" ADD CONSTRAINT "vitals_chart_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals_chart" ADD CONSTRAINT "vitals_chart_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals_chart" ADD CONSTRAINT "vitals_chart_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals_chart" ADD CONSTRAINT "vitals_chart_recorded_by_user_id_users_id_fk" FOREIGN KEY ("recorded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;