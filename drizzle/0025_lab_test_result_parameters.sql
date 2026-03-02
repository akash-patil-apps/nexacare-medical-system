-- Lab Test Result Parameters - Template parameters per catalog test (for result entry)
CREATE TABLE IF NOT EXISTS "lab_test_result_parameters" (
  "id" serial PRIMARY KEY NOT NULL,
  "lab_test_catalog_id" integer NOT NULL,
  "parameter_name" text NOT NULL,
  "unit" text,
  "normal_range" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_required" boolean DEFAULT false,
  "reference_ranges_by_group" jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone
);

ALTER TABLE "lab_test_result_parameters"
  ADD CONSTRAINT "lab_test_result_parameters_lab_test_catalog_id_lab_test_catalog_id_fk"
  FOREIGN KEY ("lab_test_catalog_id") REFERENCES "public"."lab_test_catalog"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
