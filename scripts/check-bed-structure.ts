import { db } from '../server/db';
import { hospitals, floors, wards, rooms, beds } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function checkBedStructure() {
  try {
    console.log('🔍 Checking bed structure for all hospitals...\n');

    const allHospitals = await db.select().from(hospitals);
    console.log(`Found ${allHospitals.length} hospitals\n`);

    for (const hospital of allHospitals) {
      console.log(`\n📋 ${hospital.name} (ID: ${hospital.id})`);
      
      // Check floors
      const hospitalFloors = await db.select().from(floors)
        .where(eq(floors.hospitalId, hospital.id));
      console.log(`  Floors: ${hospitalFloors.length}`);
      
      // Check wards
      const hospitalWards = await db.select().from(wards)
        .where(eq(wards.hospitalId, hospital.id));
      console.log(`  Wards: ${hospitalWards.length}`);
      
      // Check rooms
      const hospitalRooms = await db.select().from(rooms)
        .leftJoin(wards, eq(rooms.wardId, wards.id))
        .where(eq(wards.hospitalId, hospital.id));
      console.log(`  Rooms: ${hospitalRooms.length}`);
      
      // Check beds
      const hospitalBeds = await db.select().from(beds)
        .leftJoin(rooms, eq(beds.roomId, rooms.id))
        .leftJoin(wards, eq(rooms.wardId, wards.id))
        .where(eq(wards.hospitalId, hospital.id));
      console.log(`  Beds: ${hospitalBeds.length}`);
      
      // Check beds (beds table doesn't have isActive, only rooms and wards do)
      const activeBeds = await db.select().from(beds)
        .leftJoin(rooms, eq(beds.roomId, rooms.id))
        .leftJoin(wards, eq(rooms.wardId, wards.id))
        .where(and(
          eq(wards.hospitalId, hospital.id),
          eq(rooms.isActive, true),
          eq(wards.isActive, true)
        ))
        .limit(1000);
      console.log(`  Active Beds: ${activeBeds.length}`);
      
      if (activeBeds.length > 0) {
        console.log(`  ✅ Bed structure exists`);
      } else {
        console.log(`  ⚠️  No active beds found`);
      }
    }

    console.log('\n✅ Check completed!');
  } catch (error) {
    console.error('❌ Error checking bed structure:', error);
    throw error;
  }
}

checkBedStructure()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
