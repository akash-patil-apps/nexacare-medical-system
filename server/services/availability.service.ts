// server/services/availability.service.ts
import { db } from "../db";
import { appointments, doctors } from "../../shared/schema";
import { and, eq } from "drizzle-orm";

export const isDoctorAvailable = async (
  doctorId: number,
  appointmentDate: string,
  timeSlot: string
) => {
  const [conflict] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        eq(appointments.appointmentDate, new Date(appointmentDate)),
        eq(appointments.timeSlot, timeSlot)
      )
    );

  return !conflict;
};

// Update available slots (Hospital admin)
export const updateDoctorAvailability = async (
  doctorId: number,
  slots: string
) => {
  return await db
    .update(doctors)
    .set({ availableSlots: slots })
    .where(eq(doctors.id, doctorId))
    .returning();
};

// Doctor sets their in/out status
export const setDoctorStatus = async (
  doctorId: number,
  status: "in" | "out"
) => {
  return await db
    .update(doctors)
    .set({ status })
    .where(eq(doctors.id, doctorId))
    .returning();
};
