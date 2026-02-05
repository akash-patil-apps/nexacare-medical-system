-- In-platform direct messages (user-to-user, no external service)
CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "sender_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "recipient_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "body" text NOT NULL,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
