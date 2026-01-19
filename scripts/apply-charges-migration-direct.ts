import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sql = postgres(process.env.DATABASE_URL || '');

async function applyChargesMigration() {
  try {
    console.log('📋 Applying hospital charges and bed pricing migration...\n');

    // Create hospital_charges table
    await sql`
      CREATE TABLE IF NOT EXISTS "hospital_charges" (
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
        "updated_at" timestamp,
        CONSTRAINT "hospital_charges_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action
      );
    `;
    console.log('✅ Created hospital_charges table');

    // Create bed_type_pricing table
    await sql`
      CREATE TABLE IF NOT EXISTS "bed_type_pricing" (
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
        "updated_at" timestamp,
        CONSTRAINT "bed_type_pricing_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action
      );
    `;
    console.log('✅ Created bed_type_pricing table\n');

    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    if (error.code === '42P07') {
      console.log('⚠️  Tables already exist, skipping creation');
    } else {
      console.error('❌ Error applying migration:', error);
      throw error;
    }
  } finally {
    await sql.end();
  }
}

applyChargesMigration()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
