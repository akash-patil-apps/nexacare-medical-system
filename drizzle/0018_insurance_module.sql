-- Insurance Providers
CREATE TABLE IF NOT EXISTS "insurance_providers" (
  "id" serial PRIMARY KEY NOT NULL,
  "hospital_id" integer,
  "name" text NOT NULL,
  "type" text,
  "contact_email" text,
  "contact_phone" text,
  "address" text,
  "notes" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE "insurance_providers"
  ADD CONSTRAINT "insurance_providers_hospital_id_hospitals_id_fk"
  FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Patient Insurance Policies
CREATE TABLE IF NOT EXISTS "patient_insurance_policies" (
  "id" serial PRIMARY KEY NOT NULL,
  "patient_id" integer NOT NULL,
  "hospital_id" integer,
  "insurance_provider_id" integer NOT NULL,
  "policy_number" text NOT NULL,
  "policy_type" text,
  "coverage_type" text,
  "sum_insured" numeric(12,2),
  "valid_from" timestamp,
  "valid_to" timestamp,
  "is_primary" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE "patient_insurance_policies"
  ADD CONSTRAINT "patient_insurance_policies_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "patient_insurance_policies"
  ADD CONSTRAINT "patient_insurance_policies_hospital_id_hospitals_id_fk"
  FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "patient_insurance_policies"
  ADD CONSTRAINT "patient_insurance_policies_insurance_provider_id_insurance_providers_id_fk"
  FOREIGN KEY ("insurance_provider_id") REFERENCES "public"."insurance_providers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Insurance Preauthorizations
CREATE TABLE IF NOT EXISTS "insurance_preauths" (
  "id" serial PRIMARY KEY NOT NULL,
  "encounter_id" integer NOT NULL,
  "hospital_id" integer NOT NULL,
  "patient_id" integer NOT NULL,
  "insurance_policy_id" integer,
  "estimated_amount" numeric(12,2),
  "approved_amount" numeric(12,2),
  "status" text DEFAULT 'pending',
  "reference_number" text,
  "remarks" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

ALTER TABLE "insurance_preauths"
  ADD CONSTRAINT "insurance_preauths_encounter_id_ipd_encounters_id_fk"
  FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "insurance_preauths"
  ADD CONSTRAINT "insurance_preauths_hospital_id_hospitals_id_fk"
  FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "insurance_preauths"
  ADD CONSTRAINT "insurance_preauths_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "insurance_preauths"
  ADD CONSTRAINT "insurance_preauths_insurance_policy_id_patient_insurance_policies_id_fk"
  FOREIGN KEY ("insurance_policy_id") REFERENCES "public"."patient_insurance_policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Insurance Claims
CREATE TABLE IF NOT EXISTS "insurance_claims" (
  "id" serial PRIMARY KEY NOT NULL,
  "encounter_id" integer,
  "hospital_id" integer NOT NULL,
  "patient_id" integer NOT NULL,
  "insurance_policy_id" integer,
  "claim_number" text,
  "submitted_amount" numeric(12,2),
  "approved_amount" numeric(12,2),
  "status" text DEFAULT 'draft',
  "rejection_reason" text,
  "paid_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

ALTER TABLE "insurance_claims"
  ADD CONSTRAINT "insurance_claims_encounter_id_ipd_encounters_id_fk"
  FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "insurance_claims"
  ADD CONSTRAINT "insurance_claims_hospital_id_hospitals_id_fk"
  FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "insurance_claims"
  ADD CONSTRAINT "insurance_claims_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "insurance_claims"
  ADD CONSTRAINT "insurance_claims_insurance_policy_id_patient_insurance_policies_id_fk"
  FOREIGN KEY ("insurance_policy_id") REFERENCES "public"."patient_insurance_policies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

