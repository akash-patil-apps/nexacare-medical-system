-- Migration for pharmacy tables only (if they don't exist)
-- Run this manually if the main migration fails due to existing tables

-- Create suppliers table if not exists
CREATE TABLE IF NOT EXISTS "suppliers" (
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

-- Create pharmacy_inventory table if not exists
CREATE TABLE IF NOT EXISTS "pharmacy_inventory" (
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

-- Create pharmacy_stock_movements table if not exists
CREATE TABLE IF NOT EXISTS "pharmacy_stock_movements" (
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

-- Create purchase_orders table if not exists
CREATE TABLE IF NOT EXISTS "purchase_orders" (
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

-- Create purchase_order_items table if not exists
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
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

-- Create dispensations table if not exists
CREATE TABLE IF NOT EXISTS "dispensations" (
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

-- Create dispensation_items table if not exists
CREATE TABLE IF NOT EXISTS "dispensation_items" (
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

-- Add foreign key constraints (if tables exist)
DO $$ 
BEGIN
	-- Suppliers foreign keys
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_hospital_id_hospitals_id_fk') THEN
		ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;
	END IF;

	-- Pharmacy inventory foreign keys
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_inventory_hospital_id_hospitals_id_fk') THEN
		ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_inventory_medicine_catalog_id_medicine_catalog_id_fk') THEN
		ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_medicine_catalog_id_medicine_catalog_id_fk" FOREIGN KEY ("medicine_catalog_id") REFERENCES "public"."medicine_catalog"("id") ON DELETE no action ON UPDATE no action;
	END IF;

	-- Stock movements foreign keys
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_stock_movements_hospital_id_hospitals_id_fk') THEN
		ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_stock_movements_inventory_id_pharmacy_inventory_id_fk') THEN
		ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_inventory_id_pharmacy_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."pharmacy_inventory"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pharmacy_stock_movements_performed_by_user_id_users_id_fk') THEN
		ALTER TABLE "pharmacy_stock_movements" ADD CONSTRAINT "pharmacy_stock_movements_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
	END IF;

	-- Purchase orders foreign keys
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_hospital_id_hospitals_id_fk') THEN
		ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_supplier_id_suppliers_id_fk') THEN
		ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_created_by_user_id_users_id_fk') THEN
		ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
	END IF;

	-- Purchase order items foreign keys
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_items_purchase_order_id_purchase_orders_id_fk') THEN
		ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_items_medicine_catalog_id_medicine_catalog_id_fk') THEN
		ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_medicine_catalog_id_medicine_catalog_id_fk" FOREIGN KEY ("medicine_catalog_id") REFERENCES "public"."medicine_catalog"("id") ON DELETE no action ON UPDATE no action;
	END IF;

	-- Dispensations foreign keys
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispensations_hospital_id_hospitals_id_fk') THEN
		ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispensations_prescription_id_prescriptions_id_fk') THEN
		ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispensations_patient_id_patients_id_fk') THEN
		ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispensations_encounter_id_ipd_encounters_id_fk') THEN
		ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispensations_appointment_id_appointments_id_fk') THEN
		ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispensations_dispensed_by_user_id_users_id_fk') THEN
		ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_dispensed_by_user_id_users_id_fk" FOREIGN KEY ("dispensed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
	END IF;

	-- Dispensation items foreign keys
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispensation_items_dispensation_id_dispensations_id_fk') THEN
		ALTER TABLE "dispensation_items" ADD CONSTRAINT "dispensation_items_dispensation_id_dispensations_id_fk" FOREIGN KEY ("dispensation_id") REFERENCES "public"."dispensations"("id") ON DELETE no action ON UPDATE no action;
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispensation_items_inventory_id_pharmacy_inventory_id_fk') THEN
		ALTER TABLE "dispensation_items" ADD CONSTRAINT "dispensation_items_inventory_id_pharmacy_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."pharmacy_inventory"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
