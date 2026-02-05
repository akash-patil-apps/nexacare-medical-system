-- Atomic token counter per (doctor, date) to avoid duplicate tokens when multiple walk-ins are booked at once
CREATE TABLE IF NOT EXISTS "opd_token_counter" (
  "doctor_id" integer NOT NULL REFERENCES "doctors"("id"),
  "appointment_date" text NOT NULL,
  "last_token" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT NOW(),
  PRIMARY KEY ("doctor_id", "appointment_date")
);
