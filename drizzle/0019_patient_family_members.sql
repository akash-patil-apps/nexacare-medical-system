-- Patient family members - links primary patient to family member patients (for booking on behalf)
CREATE TABLE IF NOT EXISTS "patient_family_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "primary_patient_id" integer NOT NULL,
  "related_patient_id" integer NOT NULL,
  "relationship" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "patient_family_members"
  ADD CONSTRAINT "patient_family_members_primary_patient_id_patients_id_fk"
  FOREIGN KEY ("primary_patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "patient_family_members"
  ADD CONSTRAINT "patient_family_members_related_patient_id_patients_id_fk"
  FOREIGN KEY ("related_patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
