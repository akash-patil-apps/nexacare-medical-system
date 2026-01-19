CREATE TABLE "dispensation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"dispensation_id" integer NOT NULL,
	"prescription_item_id" integer,
	"inventory_id" integer NOT NULL,
	"medicine_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"batch_number" text,
	"expiry_date" timestamp,
	"unit_price" numeric(10, 2),
	"total_price" numeric(10, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dispensations" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"prescription_id" integer,
	"patient_id" integer NOT NULL,
	"encounter_id" integer,
	"appointment_id" integer,
	"dispensation_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"dispensed_by_user_id" integer,
	"dispensed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "lab_test_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"category" text NOT NULL,
	"sub_category" text,
	"description" text,
	"preparation_instructions" text,
	"sample_type" text,
	"normal_range" text,
	"turnaround_time" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "lab_test_catalog_name_unique" UNIQUE("name"),
	CONSTRAINT "lab_test_catalog_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "medication_administrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"medication_order_id" integer NOT NULL,
	"encounter_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"administered_at" timestamp,
	"administered_by_user_id" integer,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"dose_given" text,
	"route_used" text,
	"notes" text,
	"reason" text,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "medication_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"encounter_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"ordered_by_doctor_id" integer NOT NULL,
	"medication_name" text NOT NULL,
	"dosage" text NOT NULL,
	"unit" text NOT NULL,
	"route" text NOT NULL,
	"frequency" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_prn" boolean DEFAULT false,
	"prn_indication" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "medicine_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"generic_name" text,
	"brand_name" text,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"dosage_form" text,
	"strength" text,
	"unit" text,
	"manufacturer" text,
	"description" text,
	"indications" text,
	"contraindications" text,
	"side_effects" text,
	"storage_conditions" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "medicine_catalog_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "nurse_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"encounter_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"nurse_id" integer NOT NULL,
	"activity_type" text NOT NULL,
	"activity_subtype" text,
	"entity_type" text,
	"entity_id" integer,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nurse_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"encounter_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"nurse_id" integer NOT NULL,
	"assigned_by_user_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"unassigned_at" timestamp,
	"unassigned_by_user_id" integer,
	"reason" text,
	"shift_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pharmacy_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"medicine_catalog_id" integer NOT NULL,
	"batch_number" text NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit" text NOT NULL,
	"purchase_price" numeric(10, 2),
	"selling_price" numeric(10, 2),
	"mrp" numeric(10, 2),
	"location" text,
	"reorder_level" integer DEFAULT 10,
	"min_stock_level" integer DEFAULT 5,
	"max_stock_level" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pharmacy_stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"inventory_id" integer NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"reference_type" text,
	"reference_id" integer,
	"reason" text,
	"performed_by_user_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_order_id" integer NOT NULL,
	"medicine_catalog_id" integer NOT NULL,
	"batch_number" text,
	"expiry_date" timestamp,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"received_quantity" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"po_number" text NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"expected_delivery_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0',
	"tax_amount" numeric(10, 2) DEFAULT '0',
	"final_amount" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"created_by_user_id" integer NOT NULL,
	"approved_by_user_id" integer,
	"approved_at" timestamp,
	"received_by_user_id" integer,
	"received_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE "radiology_test_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"category" text NOT NULL,
	"sub_category" text,
	"description" text,
	"preparation_instructions" text,
	"body_part" text,
	"contrast_required" boolean DEFAULT false,
	"radiation_dose" text,
	"turnaround_time" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "radiology_test_catalog_name_unique" UNIQUE("name"),
	CONSTRAINT "radiology_test_catalog_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"name" text NOT NULL,
	"contact_person" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"gst_number" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD COLUMN "assigned_nurse_id" integer;--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD COLUMN "assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD COLUMN "assigned_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "dispensation_items" ADD CONSTRAINT "dispensation_items_dispensation_id_dispensations_id_fk" FOREIGN KEY ("dispensation_id") REFERENCES "public"."dispensations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensation_items" ADD CONSTRAINT "dispensation_items_inventory_id_pharmacy_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."pharmacy_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_dispensed_by_user_id_users_id_fk" FOREIGN KEY ("dispensed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_medication_order_id_medication_orders_id_fk" FOREIGN KEY ("medication_order_id") REFERENCES "public"."medication_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administered_by_user_id_users_id_fk" FOREIGN KEY ("administered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_ordered_by_doctor_id_doctors_id_fk" FOREIGN KEY ("ordered_by_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_activity_logs" ADD CONSTRAINT "nurse_activity_logs_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_activity_logs" ADD CONSTRAINT "nurse_activity_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_activity_logs" ADD CONSTRAINT "nurse_activity_logs_nurse_id_nurses_id_fk" FOREIGN KEY ("nurse_id") REFERENCES "public"."nurses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_assignments" ADD CONSTRAINT "nurse_assignments_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_assignments" ADD CONSTRAINT "nurse_assignments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_assignments" ADD CONSTRAINT "nurse_assignments_nurse_id_nurses_id_fk" FOREIGN KEY ("nurse_id") REFERENCES "public"."nurses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_assignments" ADD CONSTRAINT "nurse_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurse_assignments" ADD CONSTRAINT "nurse_assignments_unassigned_by_user_id_users_id_fk" FOREIGN KEY ("unassigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_medicine_catalog_id_medicine_catalog_id_fk" FOREIGN KEY ("medicine_catalog_id") REFERENCES "public"."medicine_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_inventory_id_pharmacy_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."pharmacy_inventory"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_medicine_catalog_id_medicine_catalog_id_fk" FOREIGN KEY ("medicine_catalog_id") REFERENCES "public"."medicine_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD CONSTRAINT "ipd_encounters_assigned_nurse_id_nurses_id_fk" FOREIGN KEY ("assigned_nurse_id") REFERENCES "public"."nurses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_encounters" ADD CONSTRAINT "ipd_encounters_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;