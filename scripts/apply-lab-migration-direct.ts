// scripts/apply-lab-migration-direct.ts
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_NQrYiJCf3kG0@ep-floral-fire-a1368kxn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 30,
});

async function applyMigration() {
  try {
    console.log('🚀 Creating lab workflow tables...');

    // Create lab_orders table
    await sql`
      CREATE TABLE IF NOT EXISTS lab_orders (
        id serial PRIMARY KEY NOT NULL,
        hospital_id integer NOT NULL,
        patient_id integer NOT NULL,
        doctor_id integer NOT NULL,
        appointment_id integer,
        encounter_id integer,
        order_number text NOT NULL UNIQUE,
        order_date timestamp DEFAULT now() NOT NULL,
        priority text DEFAULT 'routine',
        status text DEFAULT 'ordered' NOT NULL,
        clinical_notes text,
        ordered_by_user_id integer NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp
      )
    `;
    console.log('✅ Created lab_orders table');

    // Create lab_order_items table
    await sql`
      CREATE TABLE IF NOT EXISTS lab_order_items (
        id serial PRIMARY KEY NOT NULL,
        lab_order_id integer NOT NULL,
        lab_test_catalog_id integer NOT NULL,
        test_name text NOT NULL,
        status text DEFAULT 'ordered' NOT NULL,
        notes text,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Created lab_order_items table');

    // Create lab_samples table
    await sql`
      CREATE TABLE IF NOT EXISTS lab_samples (
        id serial PRIMARY KEY NOT NULL,
        lab_order_item_id integer NOT NULL,
        lab_order_id integer NOT NULL,
        sample_number text NOT NULL UNIQUE,
        sample_type text NOT NULL,
        collection_date timestamp,
        collection_time timestamp,
        collected_by_user_id integer,
        status text DEFAULT 'pending' NOT NULL,
        notes text,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Created lab_samples table');

    // Create lab_results table
    await sql`
      CREATE TABLE IF NOT EXISTS lab_results (
        id serial PRIMARY KEY NOT NULL,
        lab_order_item_id integer NOT NULL,
        lab_sample_id integer,
        test_name text NOT NULL,
        parameter_name text,
        result_value text,
        unit text,
        normal_range text,
        is_abnormal boolean DEFAULT false,
        entered_by_user_id integer NOT NULL,
        validated_by_user_id integer,
        validated_at timestamp,
        status text DEFAULT 'pending' NOT NULL,
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp
      )
    `;
    console.log('✅ Created lab_results table');

    // Add lab_order_id column to lab_reports if it doesn't exist
    try {
      await sql`ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS lab_order_id integer`;
      await sql`ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS released_by_user_id integer`;
      await sql`ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS released_at timestamp`;
      console.log('✅ Updated lab_reports table');
    } catch (e: any) {
      if (e.code !== '42701') { // Column already exists
        console.log('⚠️  lab_reports update:', e.message);
      }
    }

    // Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    
    const fkStatements = [
      { name: 'lab_orders hospital', sql: sql`ALTER TABLE lab_orders ADD CONSTRAINT IF NOT EXISTS lab_orders_hospital_id_hospitals_id_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_orders patient', sql: sql`ALTER TABLE lab_orders ADD CONSTRAINT IF NOT EXISTS lab_orders_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_orders doctor', sql: sql`ALTER TABLE lab_orders ADD CONSTRAINT IF NOT EXISTS lab_orders_doctor_id_doctors_id_fk FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_order_items order', sql: sql`ALTER TABLE lab_order_items ADD CONSTRAINT IF NOT EXISTS lab_order_items_lab_order_id_lab_orders_id_fk FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_order_items test', sql: sql`ALTER TABLE lab_order_items ADD CONSTRAINT IF NOT EXISTS lab_order_items_lab_test_catalog_id_lab_test_catalog_id_fk FOREIGN KEY (lab_test_catalog_id) REFERENCES lab_test_catalog(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_samples item', sql: sql`ALTER TABLE lab_samples ADD CONSTRAINT IF NOT EXISTS lab_samples_lab_order_item_id_lab_order_items_id_fk FOREIGN KEY (lab_order_item_id) REFERENCES lab_order_items(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_samples order', sql: sql`ALTER TABLE lab_samples ADD CONSTRAINT IF NOT EXISTS lab_samples_lab_order_id_lab_orders_id_fk FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_results item', sql: sql`ALTER TABLE lab_results ADD CONSTRAINT IF NOT EXISTS lab_results_lab_order_item_id_lab_order_items_id_fk FOREIGN KEY (lab_order_item_id) REFERENCES lab_order_items(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_results sample', sql: sql`ALTER TABLE lab_results ADD CONSTRAINT IF NOT EXISTS lab_results_lab_sample_id_lab_samples_id_fk FOREIGN KEY (lab_sample_id) REFERENCES lab_samples(id) ON DELETE no action ON UPDATE no action` },
      { name: 'lab_reports order', sql: sql`ALTER TABLE lab_reports ADD CONSTRAINT IF NOT EXISTS lab_reports_lab_order_id_lab_orders_id_fk FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE no action ON UPDATE no action` },
    ];

    for (const fk of fkStatements) {
      try {
        await fk.sql;
      } catch (e: any) {
        if (e.code !== '42P16' && !e.message?.includes('already exists')) {
          console.log(`⚠️  ${fk.name} FK:`, e.message);
        }
      }
    }

    console.log('✅ Lab migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
