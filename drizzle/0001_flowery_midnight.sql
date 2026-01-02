ALTER TABLE "users" ALTER COLUMN "mobile_number" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "labs" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "labs" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "hospital_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_hospital_id_hospitals_id_fk"
    FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN
  NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
EXCEPTION WHEN duplicate_object OR duplicate_table THEN
  NULL;
END $$;