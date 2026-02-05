-- Government ID on patients (onboarding)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "government_id_type" text;
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "government_id_number" text;

-- Attendant on IPD admission
--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD COLUMN IF NOT EXISTS "attendant_name" text;
--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD COLUMN IF NOT EXISTS "attendant_mobile" text;
