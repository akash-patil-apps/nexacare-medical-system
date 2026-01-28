CREATE TABLE "appointment_reschedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"requested_by_role" text NOT NULL,
	"requested_by_user_id" integer NOT NULL,
	"old_date" timestamp,
	"old_time_slot" text,
	"new_date" timestamp,
	"new_time_slot" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"reason_category" text,
	"reason_note" text,
	"reviewed_by_user_id" integer,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "appointment_reschedules_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "temp_token_number" integer;--> statement-breakpoint
ALTER TABLE "appointment_reschedules" ADD CONSTRAINT "appointment_reschedules_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_reschedules" ADD CONSTRAINT "appointment_reschedules_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_reschedules" ADD CONSTRAINT "appointment_reschedules_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;