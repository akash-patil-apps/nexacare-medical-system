CREATE TABLE "diet_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"encounter_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"ordered_by_doctor_id" integer NOT NULL,
	"diet_type" text NOT NULL,
	"special_instructions" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "iv_fluid_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"encounter_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"ordered_by_doctor_id" integer NOT NULL,
	"fluid_name" text NOT NULL,
	"volume" text NOT NULL,
	"rate" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "nursing_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"encounter_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"ordered_by_doctor_id" integer NOT NULL,
	"order_type" text NOT NULL,
	"order_description" text NOT NULL,
	"frequency" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "diet_orders" ADD CONSTRAINT "diet_orders_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_orders" ADD CONSTRAINT "diet_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_orders" ADD CONSTRAINT "diet_orders_ordered_by_doctor_id_doctors_id_fk" FOREIGN KEY ("ordered_by_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iv_fluid_orders" ADD CONSTRAINT "iv_fluid_orders_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iv_fluid_orders" ADD CONSTRAINT "iv_fluid_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iv_fluid_orders" ADD CONSTRAINT "iv_fluid_orders_ordered_by_doctor_id_doctors_id_fk" FOREIGN KEY ("ordered_by_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursing_orders" ADD CONSTRAINT "nursing_orders_encounter_id_ipd_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."ipd_encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursing_orders" ADD CONSTRAINT "nursing_orders_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nursing_orders" ADD CONSTRAINT "nursing_orders_ordered_by_doctor_id_doctors_id_fk" FOREIGN KEY ("ordered_by_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;