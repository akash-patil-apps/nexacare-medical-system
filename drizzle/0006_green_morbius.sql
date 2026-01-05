CREATE TABLE "patient_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer,
	"patient_id" integer NOT NULL,
	"actor_user_id" integer NOT NULL,
	"actor_role" varchar(50) NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"before" text,
	"after" text,
	"message" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_audit_logs" ADD CONSTRAINT "patient_audit_logs_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_audit_logs" ADD CONSTRAINT "patient_audit_logs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_audit_logs" ADD CONSTRAINT "patient_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;