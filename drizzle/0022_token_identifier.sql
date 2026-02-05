-- Add token_identifier to appointments and opd_queue_entries (OPD token spec: stable slot-based id, never renumbered)
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "token_identifier" text;
--> statement-breakpoint
ALTER TABLE "opd_queue_entries" ADD COLUMN IF NOT EXISTS "token_identifier" text;
