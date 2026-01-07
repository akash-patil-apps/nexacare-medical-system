CREATE TABLE "pharmacists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"hospital_id" integer NOT NULL,
	"pharmacy_degree" text NOT NULL,
	"license_number" text NOT NULL,
	"specialization" text,
	"experience" integer,
	"shift_type" text DEFAULT 'day',
	"working_hours" text,
	"pharmacy_type" text DEFAULT 'hospital',
	"languages" text,
	"certifications" text,
	"bio" text,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"is_verified" boolean DEFAULT false,
	"approval_status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "radiology_technicians" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"hospital_id" integer NOT NULL,
	"radiology_degree" text NOT NULL,
	"license_number" text NOT NULL,
	"specialization" text,
	"experience" integer,
	"shift_type" text DEFAULT 'day',
	"working_hours" text,
	"modalities" text,
	"languages" text,
	"certifications" text,
	"bio" text,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"is_verified" boolean DEFAULT false,
	"approval_status" text DEFAULT 'pending'
);
--> statement-breakpoint
ALTER TABLE "pharmacists" ADD CONSTRAINT "pharmacists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacists" ADD CONSTRAINT "pharmacists_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_technicians" ADD CONSTRAINT "radiology_technicians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radiology_technicians" ADD CONSTRAINT "radiology_technicians_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;