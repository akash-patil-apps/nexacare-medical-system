// scripts/apply-pharmacy-migration-direct.ts
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
    console.log('🚀 Creating pharmacy tables...');

    // Create suppliers table
    await sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id serial PRIMARY KEY NOT NULL,
        hospital_id integer NOT NULL,
        name text NOT NULL,
        contact_person text,
        email text,
        phone text,
        address text,
        city text,
        state text,
        zip_code text,
        gst_number text,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp
      )
    `;
    console.log('✅ Created suppliers table');

    // Create pharmacy_inventory table
    await sql`
      CREATE TABLE IF NOT EXISTS pharmacy_inventory (
        id serial PRIMARY KEY NOT NULL,
        hospital_id integer NOT NULL,
        medicine_catalog_id integer NOT NULL,
        batch_number text NOT NULL,
        expiry_date timestamp NOT NULL,
        quantity integer DEFAULT 0 NOT NULL,
        unit text NOT NULL,
        purchase_price numeric(10, 2),
        selling_price numeric(10, 2),
        mrp numeric(10, 2),
        location text,
        reorder_level integer DEFAULT 10,
        min_stock_level integer DEFAULT 5,
        max_stock_level integer,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp
      )
    `;
    console.log('✅ Created pharmacy_inventory table');

    // Create pharmacy_stock_movements table
    await sql`
      CREATE TABLE IF NOT EXISTS pharmacy_stock_movements (
        id serial PRIMARY KEY NOT NULL,
        hospital_id integer NOT NULL,
        inventory_id integer NOT NULL,
        movement_type text NOT NULL,
        quantity integer NOT NULL,
        unit text NOT NULL,
        reference_type text,
        reference_id integer,
        reason text,
        performed_by_user_id integer NOT NULL,
        notes text,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Created pharmacy_stock_movements table');

    // Create purchase_orders table
    await sql`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id serial PRIMARY KEY NOT NULL,
        hospital_id integer NOT NULL,
        supplier_id integer NOT NULL,
        po_number text NOT NULL UNIQUE,
        order_date timestamp DEFAULT now() NOT NULL,
        expected_delivery_date timestamp,
        status text DEFAULT 'pending' NOT NULL,
        total_amount numeric(10, 2) DEFAULT '0',
        tax_amount numeric(10, 2) DEFAULT '0',
        final_amount numeric(10, 2) DEFAULT '0',
        notes text,
        created_by_user_id integer NOT NULL,
        approved_by_user_id integer,
        approved_at timestamp,
        received_by_user_id integer,
        received_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp
      )
    `;
    console.log('✅ Created purchase_orders table');

    // Create purchase_order_items table
    await sql`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id serial PRIMARY KEY NOT NULL,
        purchase_order_id integer NOT NULL,
        medicine_catalog_id integer NOT NULL,
        batch_number text,
        expiry_date timestamp,
        quantity integer NOT NULL,
        unit text NOT NULL,
        unit_price numeric(10, 2) NOT NULL,
        total_price numeric(10, 2) NOT NULL,
        received_quantity integer DEFAULT 0,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Created purchase_order_items table');

    // Create dispensations table
    await sql`
      CREATE TABLE IF NOT EXISTS dispensations (
        id serial PRIMARY KEY NOT NULL,
        hospital_id integer NOT NULL,
        prescription_id integer,
        patient_id integer NOT NULL,
        encounter_id integer,
        appointment_id integer,
        dispensation_type text NOT NULL,
        status text DEFAULT 'pending' NOT NULL,
        total_amount numeric(10, 2) DEFAULT '0',
        notes text,
        dispensed_by_user_id integer,
        dispensed_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp
      )
    `;
    console.log('✅ Created dispensations table');

    // Create dispensation_items table
    await sql`
      CREATE TABLE IF NOT EXISTS dispensation_items (
        id serial PRIMARY KEY NOT NULL,
        dispensation_id integer NOT NULL,
        prescription_item_id integer,
        inventory_id integer NOT NULL,
        medicine_name text NOT NULL,
        quantity integer NOT NULL,
        unit text NOT NULL,
        batch_number text,
        expiry_date timestamp,
        unit_price numeric(10, 2),
        total_price numeric(10, 2),
        notes text,
        created_at timestamp DEFAULT now()
      )
    `;
    console.log('✅ Created dispensation_items table');

    // Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    
    try {
      await sql`ALTER TABLE suppliers ADD CONSTRAINT suppliers_hospital_id_hospitals_id_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  suppliers FK:', e.message);
    }

    try {
      await sql`ALTER TABLE pharmacy_inventory ADD CONSTRAINT pharmacy_inventory_hospital_id_hospitals_id_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  inventory hospital FK:', e.message);
    }

    try {
      await sql`ALTER TABLE pharmacy_inventory ADD CONSTRAINT pharmacy_inventory_medicine_catalog_id_medicine_catalog_id_fk FOREIGN KEY (medicine_catalog_id) REFERENCES medicine_catalog(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  inventory medicine FK:', e.message);
    }

    try {
      await sql`ALTER TABLE pharmacy_stock_movements ADD CONSTRAINT pharmacy_stock_movements_hospital_id_hospitals_id_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  movements hospital FK:', e.message);
    }

    try {
      await sql`ALTER TABLE pharmacy_stock_movements ADD CONSTRAINT pharmacy_stock_movements_inventory_id_pharmacy_inventory_id_fk FOREIGN KEY (inventory_id) REFERENCES pharmacy_inventory(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  movements inventory FK:', e.message);
    }

    try {
      await sql`ALTER TABLE pharmacy_stock_movements ADD CONSTRAINT pharmacy_stock_movements_performed_by_user_id_users_id_fk FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  movements user FK:', e.message);
    }

    try {
      await sql`ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_hospital_id_hospitals_id_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  PO hospital FK:', e.message);
    }

    try {
      await sql`ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  PO supplier FK:', e.message);
    }

    try {
      await sql`ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_purchase_order_id_purchase_orders_id_fk FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  PO items PO FK:', e.message);
    }

    try {
      await sql`ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_medicine_catalog_id_medicine_catalog_id_fk FOREIGN KEY (medicine_catalog_id) REFERENCES medicine_catalog(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  PO items medicine FK:', e.message);
    }

    try {
      await sql`ALTER TABLE dispensations ADD CONSTRAINT dispensations_hospital_id_hospitals_id_fk FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  dispensations hospital FK:', e.message);
    }

    try {
      await sql`ALTER TABLE dispensations ADD CONSTRAINT dispensations_prescription_id_prescriptions_id_fk FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  dispensations prescription FK:', e.message);
    }

    try {
      await sql`ALTER TABLE dispensations ADD CONSTRAINT dispensations_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  dispensations patient FK:', e.message);
    }

    try {
      await sql`ALTER TABLE dispensation_items ADD CONSTRAINT dispensation_items_dispensation_id_dispensations_id_fk FOREIGN KEY (dispensation_id) REFERENCES dispensations(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  dispensation items dispensation FK:', e.message);
    }

    try {
      await sql`ALTER TABLE dispensation_items ADD CONSTRAINT dispensation_items_inventory_id_pharmacy_inventory_id_fk FOREIGN KEY (inventory_id) REFERENCES pharmacy_inventory(id) ON DELETE no action ON UPDATE no action`;
    } catch (e: any) {
      if (e.code !== '42P16' && !e.message?.includes('already exists')) console.log('⚠️  dispensation items inventory FK:', e.message);
    }

    console.log('✅ Pharmacy migration completed successfully!');
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
