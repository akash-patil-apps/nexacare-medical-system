CREATE TABLE "nurses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"hospital_id" integer NOT NULL,
	"nursing_degree" text NOT NULL,
	"license_number" text NOT NULL,
	"specialization" text,
	"experience" integer,
	"shift_type" text DEFAULT 'day',
	"working_hours" text,
	"ward_preferences" text,
	"skills" text,
	"languages" text,
	"certifications" text,
	"bio" text,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"is_verified" boolean DEFAULT false,
	"approval_status" text DEFAULT 'pending'
);
--> statement-breakpoint
ALTER TABLE "nurses" ADD CONSTRAINT "nurses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nurses" ADD CONSTRAINT "nurses_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;