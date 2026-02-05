/**
 * One-time backfill: set token_identifier for appointments that have null
 * (e.g. created before the new OPD token spec). Uses slot + sequence per doctor/date.
 */
import { config } from 'dotenv';
config();

import { db } from '../server/db';
import { appointments } from '../shared/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { getSlotKeyFromAppointment, formatTokenIdentifier, getMaxPatientsPerSlot } from '../server/services/opd-token';
type Row = {
  id: number;
  doctorId: number;
  appointmentDate: Date | string;
  appointmentTime: string | null;
  timeSlot: string | null;
  createdAt: Date | string | null;
};

function dateStr(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return (d as Date).toISOString().slice(0, 10);
}

async function run() {
  const rows = await db
    .select({
      id: appointments.id,
      doctorId: appointments.doctorId,
      appointmentDate: appointments.appointmentDate,
      appointmentTime: appointments.appointmentTime,
      timeSlot: appointments.timeSlot,
      createdAt: appointments.createdAt,
    })
    .from(appointments)
    .where(
      and(
        isNull(appointments.tokenIdentifier),
        sql`${appointments.status} != 'cancelled'`,
        sql`(${appointments.timeSlot} IS NOT NULL AND ${appointments.timeSlot} != '')`,
      ),
    )
    .orderBy(appointments.appointmentDate, appointments.createdAt);

  if (rows.length === 0) {
    console.log('✅ No appointments need backfill (all have token_identifier or are cancelled).');
    process.exit(0);
    return;
  }

  console.log(`📋 Found ${rows.length} appointment(s) to backfill.`);

  const byGroup = new Map<string, Row[]>();
  for (const r of rows as Row[]) {
    const ds = dateStr(r.appointmentDate);
    const slotKey = getSlotKeyFromAppointment(r.appointmentTime, r.timeSlot);
    const key = `${r.doctorId}|${ds}|${slotKey.hour}|${slotKey.half}`;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(r);
  }

  let updated = 0;
  for (const [, group] of byGroup) {
    const sorted = [...group].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tA - tB || a.id - b.id;
    });
    const maxPerSlot = getMaxPatientsPerSlot(sorted[0].doctorId, dateStr(sorted[0].appointmentDate));
    for (let idx = 0; idx < sorted.length; idx++) {
      const row = sorted[idx];
      const seq = Math.min(idx + 1, maxPerSlot);
      const slotKey = getSlotKeyFromAppointment(row.appointmentTime, row.timeSlot);
      const tokenIdentifier = formatTokenIdentifier(slotKey, seq);
      await db.update(appointments).set({ tokenIdentifier }).where(eq(appointments.id, row.id));
      updated++;
      console.log(`   id=${row.id} -> ${tokenIdentifier}`);
    }
  }

  console.log(`✅ Backfill complete. Updated ${updated} appointment(s).`);
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
