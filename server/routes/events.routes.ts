import { Router } from "express";
import jwt from "jsonwebtoken";
import { onAppointmentEvent } from "../events/appointments.events";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { hospitals, receptionists } from "../../drizzle/schema";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function authenticateFromQueryToken(req: any): { id: number; role: string } | null {
  const token = (req.query?.token as string | undefined) || "";
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded?.id || !decoded?.role) return null;
    return { id: decoded.id, role: decoded.role };
  } catch {
    return null;
  }
}

router.get("/appointments", async (req, res) => {
  const user = authenticateFromQueryToken(req);
  if (!user) {
    return res.status(401).json({ message: "Access token required" });
  }

  // Resolve hospital context once for hospital/receptionist roles.
  let hospitalId: number | null = null;
  const role = (user.role || "").toUpperCase();

  if (role === "RECEPTIONIST") {
    const rec = await db
      .select({ hospitalId: receptionists.hospitalId })
      .from(receptionists)
      .where(eq(receptionists.userId, user.id))
      .limit(1);
    hospitalId = rec[0]?.hospitalId ?? null;
  }

  if (role === "HOSPITAL") {
    const hosp = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, user.id))
      .limit(1);
    hospitalId = hosp[0]?.id ?? null;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // @ts-expect-error flushHeaders exists in Node response
  res.flushHeaders?.();

  const send = (payload: any) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send({ type: "connected", at: new Date().toISOString() });

  const unsubscribe = onAppointmentEvent((evt) => {
    // Filter events to only what's relevant for this connected user.
    if (role === "PATIENT") {
      if (evt.patientUserId !== user.id) return;
    } else if (role === "DOCTOR") {
      if (evt.doctorUserId !== user.id) return;
    } else if (role === "RECEPTIONIST" || role === "HOSPITAL") {
      if (!hospitalId || evt.hospitalId !== hospitalId) return;
    } else {
      return;
    }

    send(evt);
  });

  req.on("close", () => {
    unsubscribe();
    res.end();
  });
});

export default router;





