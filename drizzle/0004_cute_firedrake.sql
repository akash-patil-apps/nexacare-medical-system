ALTER TABLE "appointments" ADD COLUMN "token_number" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "checked_in_at" timestamp;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_doctor_date_token_uq"
  ON "appointments" ("doctor_id", (("appointment_date"::date)), "token_number")
  WHERE "token_number" IS NOT NULL;