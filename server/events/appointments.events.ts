import { EventEmitter } from "events";
import { db } from "../db";
import { appointments, doctors, patients, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type AppointmentEventAction =
  | "created"
  | "confirmed"
  | "checked-in"
  | "completed"
  | "cancelled"
  | "status-updated";

export type AppointmentEvent = {
  type: "appointment.changed";
  action: AppointmentEventAction;
  appointmentId: number;
  status: string | null;
  hospitalId: number | null;
  doctorId: number | null;
  patientId: number | null;
  doctorUserId: number | null;
  patientUserId: number | null;
  occurredAt: string;
};

const emitter = new EventEmitter();

export function onAppointmentEvent(listener: (evt: AppointmentEvent) => void) {
  emitter.on("appointment", listener);
  return () => emitter.off("appointment", listener);
}

async function resolveUserIds(appointmentRow: {
  doctorId: number | null;
  patientId: number | null;
}): Promise<{ doctorUserId: number | null; patientUserId: number | null }> {
  let doctorUserId: number | null = null;
  let patientUserId: number | null = null;

  if (appointmentRow.doctorId) {
    const [doc] = await db
      .select({ userId: doctors.userId })
      .from(doctors)
      .where(eq(doctors.id, appointmentRow.doctorId))
      .limit(1);
    doctorUserId = doc?.userId ?? null;
  }

  if (appointmentRow.patientId) {
    const [pat] = await db
      .select({ userId: patients.userId })
      .from(patients)
      .where(eq(patients.id, appointmentRow.patientId))
      .limit(1);
    patientUserId = pat?.userId ?? null;
  }

  return { doctorUserId, patientUserId };
}

export async function emitAppointmentChanged(
  appointmentId: number,
  action: AppointmentEventAction
) {
  try {
    const [apt] = await db
      .select({
        id: appointments.id,
        status: appointments.status,
        hospitalId: appointments.hospitalId,
        doctorId: appointments.doctorId,
        patientId: appointments.patientId,
      })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!apt) return;

    const { doctorUserId, patientUserId } = await resolveUserIds({
      doctorId: apt.doctorId ?? null,
      patientId: apt.patientId ?? null,
    });

    const evt: AppointmentEvent = {
      type: "appointment.changed",
      action,
      appointmentId: apt.id,
      status: apt.status ?? null,
      hospitalId: apt.hospitalId ?? null,
      doctorId: apt.doctorId ?? null,
      patientId: apt.patientId ?? null,
      doctorUserId,
      patientUserId,
      occurredAt: new Date().toISOString(),
    };

    emitter.emit("appointment", evt);
  } catch (e) {
    // Best-effort: events must never break the main request flow.
    console.error("❌ Failed to emit appointment event:", e);
  }
}



