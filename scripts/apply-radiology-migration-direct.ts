// scripts/apply-radiology-migration-direct.ts
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
    console.log('🚀 Creating radiology workflow tables...');

    // Create radiology_orders table
    await sql`
      CREATE TABLE IF NOT EXISTS radiology_orders (
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
        clinical_indication text,
        ordered_by_user_id integer NOT NULL,
        scheduled_at timestamp,
        performed_by_user_id integer,
        performed_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp
      )
    `;
    console.log('✅ Created radiology_orders table');

    // Create radiology_order_items table
    await sql`
      CREATE TABLE IF NOT EXISTS radiology_order_items (
        id serial PRIMARY KEY NOT NULL,
        radiology_order_id integer NOT NULL,
        radiology_test_catalog_id integer NOT NULL,
        test_name text NOT NULL,
        status text DEFAULT 'ordered' NOT NULL,
        notes text,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Created radiology_order_items table');

    // Create radiology_reports table
    await sql`
      CREATE TABLE IF NOT EXISTS radiology_reports (
        id serial PRIMARY KEY NOT NULL,
        radiology_order_id integer,
        patient_id integer NOT NULL,
        doctor_id integer,
        radiology_technician_id integer,
        test_name text NOT NULL,
        test_type text NOT NULL,
        findings text NOT NULL,
        impression text,
        report_date timestamp NOT NULL,
        report_url text,
        image_urls text,
        status text DEFAULT 'pending',
        reported_by_user_id integer,
        reported_at timestamp,
        released_by_user_id integer,
        released_at timestamp,
        notes text,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Created radiology_reports table');

    // Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    
    const fkStatements = [
      { name: 'radiology_orders hospital', sql: sql`ALTER TABLE radiology_orders ADD CONSTRAINT IF NOT EXISTS radiology_orders_hospital_id_hospitals_id_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE no action ON UPDATE no action` },
      { name: 'radiology_orders patient', sql: sql`ALTER TABLE radiology_orders ADD CONSTRAINT IF NOT EXISTS radiology_orders_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE no action ON UPDATE no action` },
      { name: 'radiology_orders doctor', sql: sql`ALTER TABLE radiology_orders ADD CONSTRAINT IF NOT EXISTS radiology_orders_doctor_id_doctors_id_fk FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE no action ON UPDATE no action` },
      { name: 'radiology_order_items order', sql: sql`ALTER TABLE radiology_order_items ADD CONSTRAINT IF NOT EXISTS radiology_order_items_radiology_order_id_radiology_orders_id_fk FOREIGN KEY (radiology_order_id) REFERENCES radiology_orders(id) ON DELETE no action ON UPDATE no action` },
      { name: 'radiology_order_items test', sql: sql`ALTER TABLE radiology_order_items ADD CONSTRAINT IF NOT EXISTS radiology_order_items_radiology_test_catalog_id_radiology_test_catalog_id_fk FOREIGN KEY (radiology_test_catalog_id) REFERENCES radiology_test_catalog(id) ON DELETE no action ON UPDATE no action` },
      { name: 'radiology_reports order', sql: sql`ALTER TABLE radiology_reports ADD CONSTRAINT IF NOT EXISTS radiology_reports_radiology_order_id_radiology_orders_id_fk FOREIGN KEY (radiology_order_id) REFERENCES radiology_orders(id) ON DELETE no action ON UPDATE no action` },
      { name: 'radiology_reports patient', sql: sql`ALTER TABLE radiology_reports ADD CONSTRAINT IF NOT EXISTS radiology_reports_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE no action ON UPDATE no action` },
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

    console.log('✅ Radiology migration completed successfully!');
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
