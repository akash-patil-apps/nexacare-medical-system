CREATE TABLE IF NOT EXISTS "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"state_id" integer NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "states" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT 'India' NOT NULL,
	"iso2" text DEFAULT 'IN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "states_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk"
    FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN
  NULL;
END $$;