-- Add rescheduling audit fields to appointments (idempotent)
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_at" timestamp;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_from_date" timestamp;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_from_time_slot" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reschedule_reason" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "rescheduled_by" integer;

DO $$
BEGIN
  ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_rescheduled_by_users_id_fk"
  FOREIGN KEY ("rescheduled_by")
  REFERENCES "public"."users"("id")
  ON DELETE no action
  ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;











