CREATE TABLE "bed_type_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"bed_type" text NOT NULL,
	"daily_rate" numeric(10, 2) NOT NULL,
	"half_day_rate" numeric(10, 2),
	"amenities" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hospital_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"charge_type" text NOT NULL,
	"charge_category" text,
	"charge_sub_category" text,
	"item_name" text NOT NULL,
	"item_code" text,
	"description" text,
	"unit_price" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "radiology_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"radiology_order_id" integer NOT NULL,
	"radiology_test_catalog_id" integer NOT NULL,
	"test_name" text NOT NULL,
	"status" text DEFAULT 'ordered' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "radiology_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"appointment_id" integer,
	"encounter_id" integer,
	"order_number" text NOT NULL,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"priority" text DEFAULT 'routine',
	"status" text DEFAULT 'ordered' NOT NULL,
	"clinical_indication" text,
	"ordered_by_user_id" integer NOT NULL,
	"scheduled_at" timestamp,
	"performed_by_user_id" integer,
	"performed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "radiology_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "radiology_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"radiology_order_id" integer,
	"patient_id" integer NOT NULL,
	"doctor_id" integer,
	"radiology_technician_id" integer,
	"test_name" text NOT NULL,
	"test_type" text NOT NULL,
	"findings" text NOT NULL,
	"impression" text,
	"report_date" timestamp NOT NULL,
	"report_url" text,
	"image_urls" text,
	"status" text DEFAULT 'pending',
	"reported_by_user_id" integer,
	"reported_at" timestamp,
	"released_by_user_id" integer,
	"released_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bed_type_pricing" ADD CONSTRAINT "bed_type_pricing_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_charges" ADD CONSTRAINT "hospital_charges_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_order_items" ADD CONSTRAINT "radiology_order_items_radiology_order_id_radiology_orders_id_fk" FOREIGN KEY ("radiology_order_id") REFERENCES "public"."radiology_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_order_items" ADD CONSTRAINT "radiology_order_items_radiology_test_catalog_id_radiology_test_catalog_id_fk" FOREIGN KEY ("radiology_test_catalog_id") REFERENCES "public"."radiology_test_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_ordered_by_user_id_users_id_fk" FOREIGN KEY ("ordered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_radiology_order_id_radiology_orders_id_fk" FOREIGN KEY ("radiology_order_id") REFERENCES "public"."radiology_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_radiology_technician_id_radiology_technicians_id_fk" FOREIGN KEY ("radiology_technician_id") REFERENCES "public"."radiology_technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_released_by_user_id_users_id_fk" FOREIGN KEY ("released_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;