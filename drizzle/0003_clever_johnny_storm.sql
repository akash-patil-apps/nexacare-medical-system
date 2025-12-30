CREATE TABLE "prescription_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"prescription_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"action" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "photos" text;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "editable_until" timestamp;--> statement-breakpoint
ALTER TABLE "prescription_audits" ADD CONSTRAINT "prescription_audits_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_audits" ADD CONSTRAINT "prescription_audits_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;