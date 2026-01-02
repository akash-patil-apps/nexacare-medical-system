CREATE TABLE IF NOT EXISTS "prescription_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"prescription_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"action" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "photos" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "editable_until" timestamp;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "prescription_audits" ADD CONSTRAINT "prescription_audits_prescription_id_prescriptions_id_fk"
    FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN
  NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "prescription_audits" ADD CONSTRAINT "prescription_audits_doctor_id_doctors_id_fk"
    FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN
  NULL;
END $$;