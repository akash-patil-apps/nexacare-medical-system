-- When DOB is unknown: store age as of a reference date; current age = age_at_reference + years since age_reference_date
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "age_at_reference" integer;
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "age_reference_date" timestamp;
