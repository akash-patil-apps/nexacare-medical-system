import { db } from '../server/db';
import { hospitals, hospitalCharges, bedTypePricing, floors, wards, rooms, beds } from '../shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';

/**
 * Seed hospital charges and bed structures for all hospitals
 * 
 * Charge Types:
 * - bed: Daily bed charges by type
 * - lab: Lab test charges
 * - radiology: Radiology test charges
 * - pharmacy: Medication charges
 * - procedure: Surgical/procedure charges
 * - consultation: Doctor consultation charges
 * - nursing: Nursing care charges
 * - ot: Operation theater charges
 * - emergency: Emergency service charges
 * - admission: Admission charges
 * - discharge: Discharge processing charges
 * - misc: Miscellaneous charges
 */

interface ChargeData {
  chargeType: string;
  chargeCategory?: string;
  chargeSubCategory?: string;
  itemName: string;
  itemCode?: string;
  description?: string;
  unitPrice: number;
  unit: string;
}

interface BedStructure {
  floorNumber: number;
  floorName: string;
  wards: Array<{
    name: string;
    type: string;
    rooms: Array<{
      roomNumber: string;
      roomName?: string;
      category: string;
      beds: Array<{
        bedNumber: string;
        bedName?: string;
        bedType?: string;
      }>;
    }>;
  }>;
}

// Standard charge templates (will be customized per hospital)
const standardCharges: ChargeData[] = [
  // Lab Charges
  { chargeType: 'lab', chargeCategory: 'pathology', itemName: 'Complete Blood Count (CBC)', unitPrice: 300, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'pathology', itemName: 'Blood Sugar (Fasting)', unitPrice: 150, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'pathology', itemName: 'Blood Sugar (Post Prandial)', unitPrice: 150, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'pathology', itemName: 'HbA1c', unitPrice: 500, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'biochemistry', itemName: 'Liver Function Test (LFT)', unitPrice: 600, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'biochemistry', itemName: 'Kidney Function Test (KFT)', unitPrice: 600, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'biochemistry', itemName: 'Lipid Profile', unitPrice: 500, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'microbiology', itemName: 'Culture & Sensitivity', unitPrice: 800, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'serology', itemName: 'HIV Test', unitPrice: 400, unit: 'per_test' },
  { chargeType: 'lab', chargeCategory: 'serology', itemName: 'Hepatitis B Test', unitPrice: 400, unit: 'per_test' },
  
  // Radiology Charges
  { chargeType: 'radiology', chargeCategory: 'xray', itemName: 'Chest X-Ray', unitPrice: 300, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'xray', itemName: 'X-Ray (Any Part)', unitPrice: 400, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'ultrasound', itemName: 'Abdominal Ultrasound', unitPrice: 800, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'ultrasound', itemName: 'Pelvic Ultrasound', unitPrice: 900, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'ct', itemName: 'CT Scan (Head)', unitPrice: 3500, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'ct', itemName: 'CT Scan (Chest)', unitPrice: 4000, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'ct', itemName: 'CT Scan (Abdomen)', unitPrice: 4500, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'mri', itemName: 'MRI (Head)', unitPrice: 6000, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'mri', itemName: 'MRI (Spine)', unitPrice: 7000, unit: 'per_test' },
  { chargeType: 'radiology', chargeCategory: 'mri', itemName: 'MRI (Any Part)', unitPrice: 6500, unit: 'per_test' },
  
  // Procedure Charges
  { chargeType: 'procedure', chargeCategory: 'minor', itemName: 'Dressing Change', unitPrice: 200, unit: 'per_procedure' },
  { chargeType: 'procedure', chargeCategory: 'minor', itemName: 'Suturing', unitPrice: 500, unit: 'per_procedure' },
  { chargeType: 'procedure', chargeCategory: 'minor', itemName: 'Injection', unitPrice: 50, unit: 'per_injection' },
  { chargeType: 'procedure', chargeCategory: 'surgical', itemName: 'Minor Surgery', unitPrice: 5000, unit: 'per_procedure' },
  { chargeType: 'procedure', chargeCategory: 'surgical', itemName: 'Major Surgery', unitPrice: 50000, unit: 'per_procedure' },
  
  // Service Charges
  { chargeType: 'consultation', itemName: 'General Consultation', unitPrice: 500, unit: 'per_consultation' },
  { chargeType: 'consultation', itemName: 'Specialist Consultation', unitPrice: 800, unit: 'per_consultation' },
  { chargeType: 'consultation', itemName: 'Senior Consultant', unitPrice: 1500, unit: 'per_consultation' },
  { chargeType: 'nursing', itemName: 'Nursing Care (General)', unitPrice: 500, unit: 'per_day' },
  { chargeType: 'nursing', itemName: 'Nursing Care (ICU)', unitPrice: 1000, unit: 'per_day' },
  { chargeType: 'ot', itemName: 'Operation Theater Charges', unitPrice: 5000, unit: 'per_hour' },
  { chargeType: 'emergency', itemName: 'Emergency Service Charges', unitPrice: 1000, unit: 'per_visit' },
  { chargeType: 'admission', itemName: 'Admission Charges', unitPrice: 500, unit: 'per_admission' },
  { chargeType: 'discharge', itemName: 'Discharge Processing Charges', unitPrice: 200, unit: 'per_discharge' },
  { chargeType: 'misc', itemName: 'Medical Records', unitPrice: 100, unit: 'per_request' },
  { chargeType: 'misc', itemName: 'Ambulance Service', unitPrice: 1500, unit: 'per_trip' },
];

// Bed structures for different hospital tiers
const premiumBedStructure: BedStructure = {
  floorNumber: 1,
  floorName: 'First Floor',
  wards: [
    {
      name: 'ICU',
      type: 'icu',
      rooms: [
        { roomNumber: 'ICU-1', category: 'icu', beds: [{ bedNumber: '1', bedName: 'ICU Bed 1', bedType: 'icu' }] },
        { roomNumber: 'ICU-2', category: 'icu', beds: [{ bedNumber: '2', bedName: 'ICU Bed 2', bedType: 'icu' }] },
        { roomNumber: 'ICU-3', category: 'icu', beds: [{ bedNumber: '3', bedName: 'ICU Bed 3', bedType: 'icu' }] },
      ],
    },
    {
      name: 'CCU',
      type: 'ccu',
      rooms: [
        { roomNumber: 'CCU-1', category: 'ccu', beds: [{ bedNumber: '1', bedName: 'CCU Bed 1', bedType: 'ccu' }] },
        { roomNumber: 'CCU-2', category: 'ccu', beds: [{ bedNumber: '2', bedName: 'CCU Bed 2', bedType: 'ccu' }] },
      ],
    },
    {
      name: 'VIP Ward',
      type: 'vip',
      rooms: [
        { roomNumber: 'VIP-1', roomName: 'VIP Suite 1', category: 'vip', beds: [{ bedNumber: '1', bedName: 'VIP Bed 1', bedType: 'vip' }] },
        { roomNumber: 'VIP-2', roomName: 'VIP Suite 2', category: 'vip', beds: [{ bedNumber: '2', bedName: 'VIP Bed 2', bedType: 'vip' }] },
      ],
    },
    {
      name: 'Private Ward',
      type: 'private',
      rooms: [
        { roomNumber: 'P-101', category: 'private', beds: [{ bedNumber: '1', bedName: 'Private Bed 1', bedType: 'private' }] },
        { roomNumber: 'P-102', category: 'private', beds: [{ bedNumber: '2', bedName: 'Private Bed 2', bedType: 'private' }] },
        { roomNumber: 'P-103', category: 'private', beds: [{ bedNumber: '3', bedName: 'Private Bed 3', bedType: 'private' }] },
        { roomNumber: 'P-104', category: 'private', beds: [{ bedNumber: '4', bedName: 'Private Bed 4', bedType: 'private' }] },
      ],
    },
    {
      name: 'Semi-Private Ward',
      type: 'semi_private',
      rooms: [
        { roomNumber: 'SP-201', category: 'semi_private', beds: [{ bedNumber: '1', bedType: 'semi_private' }, { bedNumber: '2', bedType: 'semi_private' }] },
        { roomNumber: 'SP-202', category: 'semi_private', beds: [{ bedNumber: '3', bedType: 'semi_private' }, { bedNumber: '4', bedType: 'semi_private' }] },
        { roomNumber: 'SP-203', category: 'semi_private', beds: [{ bedNumber: '5', bedType: 'semi_private' }, { bedNumber: '6', bedType: 'semi_private' }] },
      ],
    },
    {
      name: 'General Ward',
      type: 'general',
      rooms: [
        { roomNumber: 'G-301', category: 'general', beds: [{ bedNumber: '1', bedType: 'general' }, { bedNumber: '2', bedType: 'general' }, { bedNumber: '3', bedType: 'general' }, { bedNumber: '4', bedType: 'general' }] },
        { roomNumber: 'G-302', category: 'general', beds: [{ bedNumber: '5', bedType: 'general' }, { bedNumber: '6', bedType: 'general' }, { bedNumber: '7', bedType: 'general' }, { bedNumber: '8', bedType: 'general' }] },
        { roomNumber: 'G-303', category: 'general', beds: [{ bedNumber: '9', bedType: 'general' }, { bedNumber: '10', bedType: 'general' }, { bedNumber: '11', bedType: 'general' }, { bedNumber: '12', bedType: 'general' }] },
      ],
    },
  ],
};

const standardBedStructure: BedStructure = {
  floorNumber: 1,
  floorName: 'First Floor',
  wards: [
    {
      name: 'ICU',
      type: 'icu',
      rooms: [
        { roomNumber: 'ICU-1', category: 'icu', beds: [{ bedNumber: '1', bedName: 'ICU Bed 1', bedType: 'icu' }] },
        { roomNumber: 'ICU-2', category: 'icu', beds: [{ bedNumber: '2', bedName: 'ICU Bed 2', bedType: 'icu' }] },
      ],
    },
    {
      name: 'Private Ward',
      type: 'private',
      rooms: [
        { roomNumber: 'P-101', category: 'private', beds: [{ bedNumber: '1', bedName: 'Private Bed 1', bedType: 'private' }] },
        { roomNumber: 'P-102', category: 'private', beds: [{ bedNumber: '2', bedName: 'Private Bed 2', bedType: 'private' }] },
        { roomNumber: 'P-103', category: 'private', beds: [{ bedNumber: '3', bedName: 'Private Bed 3', bedType: 'private' }] },
      ],
    },
    {
      name: 'Semi-Private Ward',
      type: 'semi_private',
      rooms: [
        { roomNumber: 'SP-201', category: 'semi_private', beds: [{ bedNumber: '1', bedType: 'semi_private' }, { bedNumber: '2', bedType: 'semi_private' }] },
        { roomNumber: 'SP-202', category: 'semi_private', beds: [{ bedNumber: '3', bedType: 'semi_private' }, { bedNumber: '4', bedType: 'semi_private' }] },
      ],
    },
    {
      name: 'General Ward',
      type: 'general',
      rooms: [
        { roomNumber: 'G-301', category: 'general', beds: [{ bedNumber: '1', bedType: 'general' }, { bedNumber: '2', bedType: 'general' }, { bedNumber: '3', bedType: 'general' }, { bedNumber: '4', bedType: 'general' }] },
        { roomNumber: 'G-302', category: 'general', beds: [{ bedNumber: '5', bedType: 'general' }, { bedNumber: '6', bedType: 'general' }, { bedNumber: '7', bedType: 'general' }, { bedNumber: '8', bedType: 'general' }] },
      ],
    },
  ],
};

// Bed pricing tiers (premium vs standard)
const premiumBedPricing = [
  { bedType: 'vip', dailyRate: 15000, halfDayRate: 7500 },
  { bedType: 'private', dailyRate: 8000, halfDayRate: 4000 },
  { bedType: 'semi_private', dailyRate: 4000, halfDayRate: 2000 },
  { bedType: 'general', dailyRate: 2000, halfDayRate: 1000 },
  { bedType: 'icu', dailyRate: 12000, halfDayRate: 6000 },
  { bedType: 'ccu', dailyRate: 12000, halfDayRate: 6000 },
];

const standardBedPricing = [
  { bedType: 'private', dailyRate: 5000, halfDayRate: 2500 },
  { bedType: 'semi_private', dailyRate: 3000, halfDayRate: 1500 },
  { bedType: 'general', dailyRate: 1500, halfDayRate: 750 },
  { bedType: 'icu', dailyRate: 8000, halfDayRate: 4000 },
];

async function seedHospitalChargesAndBeds() {
  try {
    console.log('🏥 Starting hospital charges and bed structure seeding...\n');

    // Get all hospitals
    const allHospitals = await db.select().from(hospitals);
    console.log(`Found ${allHospitals.length} hospitals\n`);

    // Premium hospitals (Apollo, Fortis, Max, Kokilaben, Manipal, SevenHills, Wockhardt, Global)
    const premiumHospitals = ['Apollo Hospitals Mumbai', 'Fortis Healthcare Mumbai', 'Max Super Specialty Mumbai', 
                              'Kokilaben Hospital Mumbai', 'Manipal Hospital Mumbai', 'SevenHills Hospital Mumbai', 
                              'Wockhardt Hospital Mumbai', 'Global Hospital Mumbai'];

    for (const hospital of allHospitals) {
      const isPremium = premiumHospitals.includes(hospital.name);
      const bedStructure = isPremium ? premiumBedStructure : standardBedStructure;
      const bedPricing = isPremium ? premiumBedPricing : standardBedPricing;

      console.log(`📋 Processing ${hospital.name} (${isPremium ? 'Premium' : 'Standard'})...`);

      // 1. Insert bed type pricing
      for (const pricing of bedPricing) {
        await db.insert(bedTypePricing).values({
          hospitalId: hospital.id,
          bedType: pricing.bedType,
          dailyRate: pricing.dailyRate.toString(),
          halfDayRate: pricing.halfDayRate.toString(),
          isActive: true,
        }).onConflictDoNothing();
      }
      console.log(`  ✅ Added ${bedPricing.length} bed type pricing entries`);

      // 2. Insert standard charges (with hospital-specific price variations)
      const priceMultiplier = isPremium ? 1.2 : 1.0; // Premium hospitals charge 20% more
      let chargesCount = 0;
      for (const charge of standardCharges) {
        const adjustedPrice = Math.round(charge.unitPrice * priceMultiplier);
        await db.insert(hospitalCharges).values({
          hospitalId: hospital.id,
          chargeType: charge.chargeType,
          chargeCategory: charge.chargeCategory || null,
          chargeSubCategory: charge.chargeSubCategory || null,
          itemName: charge.itemName,
          itemCode: charge.itemCode || null,
          description: charge.description || null,
          unitPrice: adjustedPrice.toString(),
          unit: charge.unit,
          isActive: true,
        }).onConflictDoNothing();
        chargesCount++;
      }
      console.log(`  ✅ Added ${chargesCount} charge entries`);

      // 3. Create bed structure
      // Check if floor already exists
      let floor = await db.select().from(floors)
        .where(eq(floors.hospitalId, hospital.id))
        .where(eq(floors.floorNumber, bedStructure.floorNumber))
        .limit(1);

      let floorId: number;
      if (floor.length === 0) {
        const [newFloor] = await db.insert(floors).values({
          hospitalId: hospital.id,
          floorNumber: bedStructure.floorNumber,
          floorName: bedStructure.floorName,
          isActive: true,
        }).returning();
        floorId = newFloor.id;
      } else {
        floorId = floor[0].id;
      }

      // Check if hospital already has beds - if yes, skip creating structure
      // Use a subquery to count beds for this hospital
      const hospitalRoomIds = await db
        .select({ id: rooms.id })
        .from(rooms)
        .leftJoin(wards, eq(rooms.wardId, wards.id))
        .where(eq(wards.hospitalId, hospital.id));
      
      const roomIds = hospitalRoomIds.map(r => r.id);
      const totalExistingBeds = roomIds.length > 0 
        ? Number((await db.select({ count: sql<number>`count(*)` })
            .from(beds)
            .where(inArray(beds.roomId, roomIds)))[0]?.count || 0)
        : 0;
      
      if (totalExistingBeds > 0) {
        console.log(`  ⏭️  Bed structure already exists (${totalExistingBeds} beds), skipping...\n`);
        continue;
      }

      let bedsCount = 0;
      for (const wardData of bedStructure.wards) {
        // Check if ward exists
        let ward = await db.select().from(wards)
          .where(eq(wards.hospitalId, hospital.id))
          .where(eq(wards.name, wardData.name))
          .limit(1);

        let wardId: number;
        if (ward.length === 0) {
          const [newWard] = await db.insert(wards).values({
            hospitalId: hospital.id,
            floorId: floorId,
            name: wardData.name,
            type: wardData.type,
            genderPolicy: 'mixed',
            capacity: wardData.rooms.reduce((sum, room) => sum + room.beds.length, 0),
            isActive: true,
          }).returning();
          wardId = newWard.id;
        } else {
          wardId = ward[0].id;
        }

        for (const roomData of wardData.rooms) {
          // Check if room exists
          let room = await db.select().from(rooms)
            .where(eq(rooms.wardId, wardId))
            .where(eq(rooms.roomNumber, roomData.roomNumber))
            .limit(1);

          let roomId: number;
          if (room.length === 0) {
            const [newRoom] = await db.insert(rooms).values({
              wardId: wardId,
              roomNumber: roomData.roomNumber,
              roomName: roomData.roomName || null,
              category: roomData.category,
              capacity: roomData.beds.length,
              amenities: JSON.stringify(['AC', 'TV', 'Attached Bathroom']),
              isActive: true,
            }).returning();
            roomId = newRoom.id;
          } else {
            roomId = room[0].id;
          }

          for (const bedData of roomData.beds) {
            // Check if bed exists
            const existingBed = await db.select().from(beds)
              .where(eq(beds.roomId, roomId))
              .where(eq(beds.bedNumber, bedData.bedNumber))
              .limit(1);

            if (existingBed.length === 0) {
              await db.insert(beds).values({
                roomId: roomId,
                bedNumber: bedData.bedNumber,
                bedName: bedData.bedName || null,
                status: 'available',
                bedType: bedData.bedType || roomData.category,
                equipment: JSON.stringify(['Monitor', 'Oxygen']),
              });
              bedsCount++;
            }
          }
        }
      }
      console.log(`  ✅ Created bed structure with ${bedsCount} beds\n`);
    }

    console.log('✅ Hospital charges and bed structure seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding hospital charges and beds:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedHospitalChargesAndBeds()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedHospitalChargesAndBeds };
