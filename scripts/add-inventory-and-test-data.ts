// Script to add inventory for pharmacist and populate test data for all dashboards
import { db } from '../server/db';
import { 
  users, 
  pharmacists, 
  hospitals,
  medicineCatalog,
  pharmacyInventory,
  appointments,
  prescriptions,
  prescriptionItems,
  patients,
  doctors,
  labOrders,
  labOrderItems,
  labTestCatalog,
  labReports,
  ipdEncounters,
  vitalsChart,
  nursingNotes,
  radiologyOrders,
  radiologyOrderItems,
  radiologyTestCatalog,
  nurses,
  radiologyTechnicians,
  labs
} from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { addStock } from '../server/services/pharmacy-inventory.service';

const PHARMACIST_MOBILE = '9870000002';

// Common medicines to add to inventory
const COMMON_MEDICINES = [
  'Paracetamol 500mg',
  'Ibuprofen 400mg',
  'Amoxicillin 500mg',
  'Azithromycin 500mg',
  'Cetirizine 10mg',
  'Omeprazole 20mg',
  'Metformin 500mg',
  'Amlodipine 5mg',
  'Atorvastatin 10mg',
  'Losartan 50mg',
  'Doxycycline 100mg',
  'Ciprofloxacin 500mg',
  'Levofloxacin 500mg',
  'Pantoprazole 40mg',
  'Ranitidine 150mg',
  'Diclofenac 50mg',
  'Tramadol 50mg',
  'Ondansetron 4mg',
  'Domperidone 10mg',
  'Metronidazole 400mg',
];

async function addInventoryAndTestData() {
  try {
    console.log('🌱 Starting inventory and test data population...\n');

    // 1. Find pharmacist by mobile number
    console.log(`🔍 Finding pharmacist with mobile: ${PHARMACIST_MOBILE}...`);
    const pharmacistUser = await db
      .select()
      .from(users)
      .where(eq(users.mobileNumber, PHARMACIST_MOBILE))
      .limit(1);

    if (pharmacistUser.length === 0) {
      throw new Error(`Pharmacist with mobile ${PHARMACIST_MOBILE} not found`);
    }

    const user = pharmacistUser[0];
    console.log(`✅ Found user: ${user.fullName} (ID: ${user.id})\n`);

    // 2. Get pharmacist profile
    const pharmacistProfile = await db
      .select({
        pharmacist: pharmacists,
        hospital: hospitals,
      })
      .from(pharmacists)
      .leftJoin(hospitals, eq(pharmacists.hospitalId, hospitals.id))
      .where(eq(pharmacists.userId, user.id))
      .limit(1);

    if (pharmacistProfile.length === 0) {
      throw new Error(`Pharmacist profile not found for user ${user.id}`);
    }

    const { pharmacist, hospital } = pharmacistProfile[0];
    if (!hospital) {
      throw new Error(`Hospital not found for pharmacist ${pharmacist.id}`);
    }

    const hospitalId = hospital.id;
    console.log(`✅ Found pharmacist profile: ID ${pharmacist.id}`);
    console.log(`✅ Hospital: ${hospital.name} (ID: ${hospitalId})\n`);

    // 3. Get medicines from catalog
    console.log('💊 Fetching medicines from catalog...');
    const medicines = await db
      .select()
      .from(medicineCatalog)
      .where(
        and(
          eq(medicineCatalog.isActive, true)
        )
      )
      .limit(100);

    console.log(`✅ Found ${medicines.length} medicines in catalog\n`);

    // Filter to common medicines if they exist
    const medicinesToAdd = medicines.filter(m => 
      COMMON_MEDICINES.some(name => m.name.includes(name.split(' ')[0]))
    );

    // If no exact matches, use first 20 medicines
    const medicinesForInventory = medicinesToAdd.length > 0 
      ? medicinesToAdd.slice(0, 20)
      : medicines.slice(0, 20);

    console.log(`📦 Adding inventory for ${medicinesForInventory.length} medicines...\n`);

    // 4. Add inventory for each medicine
    let inventoryCount = 0;
    let skippedCount = 0;

    for (const medicine of medicinesForInventory) {
      try {
        // Generate batch number and expiry date
        const batchNumber = `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 2); // 2 years from now

        // Random quantity between 100-500
        const quantity = Math.floor(Math.random() * 400) + 100;

        // Random prices
        const purchasePrice = Math.floor(Math.random() * 50) + 10;
        const sellingPrice = Math.floor(purchasePrice * 1.3); // 30% markup
        const mrp = Math.floor(sellingPrice * 1.2); // 20% above selling price

        await addStock({
          hospitalId,
          medicineCatalogId: medicine.id,
          batchNumber,
          expiryDate,
          quantity,
          unit: medicine.unit || 'tablet',
          purchasePrice,
          sellingPrice,
          mrp,
          location: 'A-1',
          reorderLevel: 50,
          minStockLevel: 20,
          maxStockLevel: 1000,
          referenceType: 'adjustment',
          reason: 'Initial stock for testing',
          performedByUserId: user.id,
        });

        inventoryCount++;
        console.log(`  ✅ Added: ${medicine.name} (Qty: ${quantity}, Batch: ${batchNumber})`);
      } catch (error: any) {
        skippedCount++;
        console.log(`  ⚠️  Skipped ${medicine.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Added inventory for ${inventoryCount} medicines (${skippedCount} skipped)\n`);

    // 5. Create test appointments
    console.log('📅 Creating test appointments...');
    const allPatients = await db.select().from(patients).limit(10);
    const allDoctors = await db
      .select({ doctor: doctors, user: users })
      .from(doctors)
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.hospitalId, hospitalId))
      .limit(5);

    let appointmentCount = 0;
    if (allPatients.length > 0 && allDoctors.length > 0) {
      const today = new Date();
      
      // Create at least 2 completed appointments for prescriptions and lab orders
      for (let i = 0; i < Math.min(5, allPatients.length); i++) {
        const patient = allPatients[i];
        const doctorData = allDoctors[i % allDoctors.length];
        
        if (!doctorData.doctor || !doctorData.user) continue;

        const appointmentDate = new Date(today);
        appointmentDate.setDate(appointmentDate.getDate() - i); // Past dates for completed appointments

        try {
          await db.insert(appointments).values({
            hospitalId,
            patientId: patient.id,
            doctorId: doctorData.doctor.id,
            appointmentDate: appointmentDate,
            timeSlot: '10:00 AM',
            status: i < 3 ? 'completed' : 'confirmed', // First 3 are completed
            type: 'consultation',
            createdAt: new Date(),
          });
          appointmentCount++;
        } catch (error: any) {
          // Skip if duplicate or constraint error
          console.log(`  ⚠️  Skipped appointment for patient ${patient.id}: ${error.message}`);
        }
      }
      console.log(`✅ Created ${appointmentCount} test appointments\n`);
    } else {
      console.log(`⚠️  No patients or doctors found. Skipping appointments.\n`);
    }

    // 6. Create test prescriptions
    console.log('💊 Creating test prescriptions...');
    const completedAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.hospitalId, hospitalId),
        eq(appointments.status, 'completed')
      ))
      .limit(3);

    let prescriptionCount = 0;
    if (completedAppointments.length > 0 && medicinesForInventory.length > 0) {
      for (const appointment of completedAppointments) {
        try {
          // Prepare medications array first
          const numMedicines = Math.floor(Math.random() * 2) + 2;
          const selectedMedicines = medicinesForInventory.slice(0, numMedicines);

          const medicationsArray = selectedMedicines.map(medicine => ({
            medicineCatalogId: medicine.id,
            medicineName: medicine.name,
            quantity: Math.floor(Math.random() * 10) + 5,
            frequency: '1-0-1',
            duration: '7 days',
            instructions: 'After meals',
          }));

          // Create prescription with medications JSON included
          const [prescription] = await db.insert(prescriptions).values({
            hospitalId,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            appointmentId: appointment.id,
            diagnosis: 'General checkup',
            medications: JSON.stringify(medicationsArray),
            instructions: 'Follow up in 7 days',
            createdAt: new Date(),
          }).returning();

          prescriptionCount++;
          console.log(`  ✅ Created prescription ${prescription.id} with ${numMedicines} medicines`);
        } catch (error: any) {
          console.log(`  ⚠️  Skipped prescription: ${error.message}`);
        }
      }
      console.log(`✅ Created ${prescriptionCount} test prescriptions\n`);
    } else {
      console.log(`⚠️  No completed appointments or medicines found. Skipping prescriptions.\n`);
    }

    // 7. Create test lab orders
    console.log('🧪 Creating test lab orders...');
    const labTests = await db
      .select()
      .from(labTestCatalog)
      .where(eq(labTestCatalog.isActive, true))
      .limit(10);

    let labOrderCount = 0;
    if (completedAppointments.length > 0 && labTests.length > 0 && allDoctors.length > 0) {
      
      for (let i = 0; i < Math.min(3, completedAppointments.length); i++) {
        const appointment = completedAppointments[i];
        const doctorData = allDoctors[i % allDoctors.length];
        
        if (!doctorData.doctor || !doctorData.user) continue;

        try {
          const orderNumber = `LAB-${hospitalId}-${Date.now()}-${i}`;
          const [labOrder] = await db.insert(labOrders).values({
            hospitalId,
            patientId: appointment.patientId,
            doctorId: doctorData.doctor.id,
            appointmentId: appointment.id,
            orderNumber,
            priority: 'routine',
            status: 'ordered',
            clinicalNotes: 'Routine checkup',
            orderedByUserId: doctorData.user.id,
            createdAt: new Date(),
          }).returning();

          // Add 1-2 lab tests to each order
          const numTests = Math.floor(Math.random() * 2) + 1;
          const selectedTests = labTests.slice(0, numTests);

          for (const test of selectedTests) {
            await db.insert(labOrderItems).values({
              labOrderId: labOrder.id,
              labTestCatalogId: test.id,
              testName: test.name,
              status: 'ordered',
              createdAt: new Date(),
            });
          }

          labOrderCount++;
          console.log(`  ✅ Created lab order ${orderNumber} with ${numTests} tests`);
        } catch (error: any) {
          console.log(`  ⚠️  Skipped lab order: ${error.message}`);
        }
      }
      console.log(`✅ Created ${labOrderCount} test lab orders\n`);
    } else {
      console.log(`⚠️  No appointments, doctors, or lab tests found. Skipping lab orders.\n`);
    }

    // 8. Create more appointments with different statuses for various dashboards
    console.log('📅 Creating additional appointments with different statuses...');
    const allPatientsForAppts = await db.select().from(patients).limit(15);
    let additionalApptCount = 0;
    
    if (allPatientsForAppts.length > 0 && allDoctors.length > 0) {
      const statuses = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'];
      const today = new Date();
      
      for (let i = 0; i < Math.min(10, allPatientsForAppts.length); i++) {
        const patient = allPatientsForAppts[i];
        const doctorData = allDoctors[i % allDoctors.length];
        
        if (!doctorData.doctor || !doctorData.user) continue;
        
        const appointmentDate = new Date(today);
        appointmentDate.setDate(appointmentDate.getDate() + (i % 7)); // Mix of past and future dates
        const status = statuses[i % statuses.length];
        
        try {
          await db.insert(appointments).values({
            hospitalId,
            patientId: patient.id,
            doctorId: doctorData.doctor.id,
            appointmentDate: appointmentDate,
            timeSlot: `${9 + (i % 8)}:00 AM`,
            status: status,
            type: 'consultation',
            createdAt: new Date(),
          });
          additionalApptCount++;
        } catch (error: any) {
          // Skip if duplicate or constraint error - this is expected
        }
      }
      console.log(`✅ Created ${additionalApptCount} additional appointments\n`);
    } else {
      console.log(`⚠️  No patients or doctors found. Skipping additional appointments.\n`);
    }

    // 9. Create more prescriptions with different statuses
    console.log('💊 Creating additional prescriptions with different statuses...');
    const allAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.hospitalId, hospitalId))
      .limit(10);
    
    let additionalPrescriptionCount = 0;
    if (allAppointments.length > 0 && medicinesForInventory.length > 0) {
      const prescriptionStatuses = ['pending', 'ready_for_dispensing', 'dispensed'];
      
      for (let i = 0; i < Math.min(5, allAppointments.length); i++) {
        const appointment = allAppointments[i];
        if (appointment.status !== 'completed') continue;
        
        try {
          const numMedicines = Math.floor(Math.random() * 3) + 1;
          const selectedMedicines = medicinesForInventory.slice(0, numMedicines);
          const status = prescriptionStatuses[i % prescriptionStatuses.length];
          
          const medicationsArray = selectedMedicines.map(medicine => ({
            medicineCatalogId: medicine.id,
            medicineName: medicine.name,
            quantity: Math.floor(Math.random() * 10) + 5,
            frequency: '1-0-1',
            duration: '7 days',
            instructions: 'After meals',
          }));

          const [prescription] = await db.insert(prescriptions).values({
            hospitalId,
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            appointmentId: appointment.id,
            diagnosis: 'General checkup',
            medications: JSON.stringify(medicationsArray),
            instructions: 'Follow up in 7 days',
            status: status,
            createdAt: new Date(),
          }).returning();

          additionalPrescriptionCount++;
        } catch (error: any) {
          // Skip if error
        }
      }
      console.log(`✅ Created ${additionalPrescriptionCount} additional prescriptions\n`);
    }

    // 10. Create more lab orders with different statuses
    console.log('🧪 Creating additional lab orders with different statuses...');
    let additionalLabOrderCount = 0;
    if (allAppointments.length > 0 && labTests.length > 0 && allDoctors.length > 0) {
      const labStatuses = ['ordered', 'sample_collected', 'processing', 'completed'];
      
      for (let i = 0; i < Math.min(5, allAppointments.length); i++) {
        const appointment = allAppointments[i];
        const doctorData = allDoctors[i % allDoctors.length];
        
        if (!doctorData.doctor || !doctorData.user) continue;
        
        try {
          const orderNumber = `LAB-${hospitalId}-${Date.now()}-${i + 100}`;
          const status = labStatuses[i % labStatuses.length];
          
          const [labOrder] = await db.insert(labOrders).values({
            hospitalId,
            patientId: appointment.patientId,
            doctorId: doctorData.doctor.id,
            appointmentId: appointment.id,
            orderNumber,
            priority: 'routine',
            status: status,
            clinicalNotes: 'Routine checkup',
            orderedByUserId: doctorData.user.id,
            createdAt: new Date(),
          }).returning();

          const numTests = Math.floor(Math.random() * 2) + 1;
          const selectedTests = labTests.slice(0, numTests);

          for (const test of selectedTests) {
            await db.insert(labOrderItems).values({
              labOrderId: labOrder.id,
              labTestCatalogId: test.id,
              testName: test.name,
              status: status === 'completed' ? 'completed' : 'ordered',
              createdAt: new Date(),
            });
          }

          // Create lab report if status is completed
          if (status === 'completed') {
            // Get a lab for this hospital
            const hospitalLabs = await db
              .select()
              .from(labs)
              .where(eq(labs.hospitalId, hospitalId))
              .limit(1);
            
            const labId = hospitalLabs.length > 0 ? hospitalLabs[0].id : null;
            
            if (labId) {
              for (const test of selectedTests) {
                await db.insert(labReports).values({
                  labOrderId: labOrder.id,
                  patientId: appointment.patientId,
                  doctorId: doctorData.doctor.id,
                  labId: labId,
                  testName: test.name,
                  testType: test.category || 'General',
                  results: JSON.stringify({ value: 'Normal', unit: 'N/A' }),
                  normalRanges: 'Within normal limits',
                  status: 'released',
                  reportDate: new Date(),
                  releasedByUserId: doctorData.user.id,
                  releasedAt: new Date(),
                  notes: 'Normal values observed',
                  createdAt: new Date(),
                });
              }
            }
          }

          additionalLabOrderCount++;
        } catch (error: any) {
          // Skip if error
        }
      }
      console.log(`✅ Created ${additionalLabOrderCount} additional lab orders\n`);
    }

    // 11. Create IPD encounters for nurse dashboard
    console.log('🏥 Creating IPD encounters for nurse dashboard...');
    const allNurses = await db
      .select({ nurse: nurses, user: users })
      .from(nurses)
      .leftJoin(users, eq(nurses.userId, users.id))
      .where(eq(nurses.hospitalId, hospitalId))
      .limit(3);
    
    let ipdEncounterCount = 0;
    if (allPatientsForAppts.length > 0 && allDoctors.length > 0 && allNurses.length > 0) {
      for (let i = 0; i < Math.min(5, allPatientsForAppts.length); i++) {
        const patient = allPatientsForAppts[i];
        const doctorData = allDoctors[i % allDoctors.length];
        const nurseData = allNurses[i % allNurses.length];
        
        if (!doctorData.doctor || !doctorData.user || !nurseData.nurse || !nurseData.user) continue;
        
        try {
          const [encounter] = await db.insert(ipdEncounters).values({
            hospitalId,
            patientId: patient.id,
            admittingDoctorId: doctorData.doctor.id,
            attendingDoctorId: doctorData.doctor.id,
            assignedNurseId: nurseData.nurse.id,
            assignedAt: new Date(),
            assignedByUserId: nurseData.user.id,
            admissionType: i % 2 === 0 ? 'elective' : 'emergency',
            status: 'admitted',
            admittedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Different admission dates
            createdAt: new Date(),
          }).returning();

          ipdEncounterCount++;
          
          // Create vitals for this encounter
          const vitalsCount = Math.floor(Math.random() * 3) + 2; // 2-4 vitals per patient
          for (let v = 0; v < vitalsCount; v++) {
            const vitalDate = new Date(Date.now() - v * 6 * 60 * 60 * 1000); // Every 6 hours
            await db.insert(vitalsChart).values({
              hospitalId,
              patientId: patient.id,
              encounterId: encounter.id,
              temperature: (36.5 + Math.random() * 2).toFixed(2), // 36.5-38.5
              bpSystolic: 110 + Math.floor(Math.random() * 30), // 110-140
              bpDiastolic: 70 + Math.floor(Math.random() * 15), // 70-85
              pulse: 70 + Math.floor(Math.random() * 20), // 70-90
              respirationRate: 16 + Math.floor(Math.random() * 4), // 16-20
              spo2: 95 + Math.floor(Math.random() * 5), // 95-100
              recordedByUserId: nurseData.user.id,
              recordedAt: vitalDate,
              createdAt: new Date(),
            });
          }

          // Create nursing notes
          const notesCount = Math.floor(Math.random() * 2) + 1; // 1-2 notes per patient
          for (let n = 0; n < notesCount; n++) {
            await db.insert(nursingNotes).values({
              hospitalId,
              patientId: patient.id,
              encounterId: encounter.id,
              noteType: n % 2 === 0 ? 'assessment' : 'general',
              nursingAssessment: 'Patient is stable. Vital signs within normal limits.',
              notes: `Nursing note ${n + 1}: Patient responding well to treatment.`,
              createdByUserId: nurseData.user.id,
              createdAt: new Date(Date.now() - n * 12 * 60 * 60 * 1000),
            });
          }
          
          console.log(`  ✅ Created IPD encounter ${encounter.id} with vitals and notes`);
        } catch (error: any) {
          console.log(`  ⚠️  Skipped IPD encounter: ${error.message}`);
        }
      }
      console.log(`✅ Created ${ipdEncounterCount} IPD encounters with vitals and notes\n`);
    } else {
      console.log(`⚠️  No patients, doctors, or nurses found. Skipping IPD encounters.\n`);
    }

    // 12. Create radiology orders for radiology dashboard
    console.log('📷 Creating radiology orders for radiology dashboard...');
    const radiologyTests = await db
      .select()
      .from(radiologyTestCatalog)
      .where(eq(radiologyTestCatalog.isActive, true))
      .limit(10);
    
    const allRadiologyTechs = await db
      .select({ tech: radiologyTechnicians, user: users })
      .from(radiologyTechnicians)
      .leftJoin(users, eq(radiologyTechnicians.userId, users.id))
      .where(eq(radiologyTechnicians.hospitalId, hospitalId))
      .limit(2);
    
    let radiologyOrderCount = 0;
    if (allAppointments.length > 0 && radiologyTests.length > 0 && allDoctors.length > 0) {
      const radiologyStatuses = ['ordered', 'scheduled', 'in_progress', 'completed'];
      
      for (let i = 0; i < Math.min(5, allAppointments.length); i++) {
        const appointment = allAppointments[i];
        const doctorData = allDoctors[i % allDoctors.length];
        
        if (!doctorData.doctor || !doctorData.user) continue;
        
        try {
          const orderNumber = `RAD-${hospitalId}-${Date.now()}-${i}`;
          const status = radiologyStatuses[i % radiologyStatuses.length];
          
          const [radOrder] = await db.insert(radiologyOrders).values({
            hospitalId,
            patientId: appointment.patientId,
            doctorId: doctorData.doctor.id,
            appointmentId: appointment.id,
            orderNumber,
            priority: 'routine',
            status: status,
            clinicalIndication: 'Routine imaging',
            orderedByUserId: doctorData.user.id,
            orderDate: new Date(),
            createdAt: new Date(),
          }).returning();

          const numTests = Math.floor(Math.random() * 2) + 1;
          const selectedTests = radiologyTests.slice(0, numTests);

          for (const test of selectedTests) {
            await db.insert(radiologyOrderItems).values({
              radiologyOrderId: radOrder.id,
              radiologyTestCatalogId: test.id,
              testName: test.name,
              status: status,
              createdAt: new Date(),
            });
          }

          radiologyOrderCount++;
          console.log(`  ✅ Created radiology order ${orderNumber} with ${numTests} tests`);
        } catch (error: any) {
          console.log(`  ⚠️  Skipped radiology order: ${error.message}`);
        }
      }
      console.log(`✅ Created ${radiologyOrderCount} radiology orders\n`);
    } else {
      console.log(`⚠️  No appointments, doctors, or radiology tests found. Skipping radiology orders.\n`);
    }

    // Summary
    console.log('\n🎉 Inventory and test data population completed!\n');
    console.log('📊 SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Pharmacist: ${user.fullName} (${PHARMACIST_MOBILE})`);
    console.log(`✅ Hospital: ${hospital.name}`);
    console.log(`✅ Inventory Items Added: ${inventoryCount}`);
    const totalAppointments = (appointmentCount || 0) + additionalApptCount;
    console.log(`✅ Total Appointments Created: ${totalAppointments}`);
    console.log(`✅ Total Prescriptions Created: ${prescriptionCount + additionalPrescriptionCount}`);
    console.log(`✅ Total Lab Orders Created: ${labOrderCount + additionalLabOrderCount}`);
    console.log(`✅ IPD Encounters Created: ${ipdEncounterCount}`);
    console.log(`✅ Radiology Orders Created: ${radiologyOrderCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Dashboard Test Data Coverage:');
    console.log('  ✅ Pharmacist Dashboard: Inventory + Prescriptions');
    console.log('  ✅ Doctor Dashboard: Appointments + Prescriptions');
    console.log('  ✅ Patient Dashboard: Appointments + Prescriptions + Lab Reports');
    console.log('  ✅ Receptionist Dashboard: Appointments (all statuses)');
    console.log('  ✅ Lab Dashboard: Lab Orders (all statuses) + Reports');
    console.log('  ✅ Nurse Dashboard: IPD Encounters + Vitals + Nursing Notes');
    console.log('  ✅ Radiology Dashboard: Radiology Orders (all statuses)');
    console.log('  ✅ Hospital Dashboard: Overall statistics from all data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
addInventoryAndTestData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
