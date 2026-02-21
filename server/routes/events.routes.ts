import { Router } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../env";
import { onAppointmentEvent } from "../events/appointments.events";
import { setOnline, setOffline, heartbeat } from "../presence/store.js";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { hospitals, receptionists } from "../../shared/schema";

const router = Router();

function authenticateFromQueryToken(req: any): { id: number; role: string } | null {
  const token = (req.query?.token as string | undefined) || "";
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
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

  // Resolve hospital context once for hospital/receptionist/nurse roles.
  let hospitalId: number | null = null;
  const role = (user.role || "").toUpperCase();

  if (role === "RECEPTIONIST") {
    try {
      const rec = await db
        .select({ hospitalId: receptionists.hospitalId })
        .from(receptionists)
        .where(eq(receptionists.userId, user.id))
        .limit(1);
      hospitalId = rec[0]?.hospitalId ?? null;
    } catch (e) {
      console.error("❌ SSE: Failed to resolve receptionist hospital context:", e);
      return res.status(503).json({ message: "Database unavailable. Please retry shortly." });
    }
  }

  if (role === "HOSPITAL") {
    try {
      const hosp = await db
        .select({ id: hospitals.id })
        .from(hospitals)
        .where(eq(hospitals.userId, user.id))
        .limit(1);
      hospitalId = hosp[0]?.id ?? null;
    } catch (e) {
      console.error("❌ SSE: Failed to resolve hospital context:", e);
      return res.status(503).json({ message: "Database unavailable. Please retry shortly." });
    }
  }

  if (role === "NURSE") {
    try {
      const { nurses } = await import('../../shared/schema');
      const nurse = await db
        .select({ hospitalId: nurses.hospitalId })
        .from(nurses)
        .where(eq(nurses.userId, user.id))
        .limit(1);
      hospitalId = nurse[0]?.hospitalId ?? null;
    } catch (e) {
      console.error("❌ SSE: Failed to resolve nurse hospital context:", e);
      return res.status(503).json({ message: "Database unavailable. Please retry shortly." });
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // flushHeaders exists in Node response (not typed on Express Response)
  (res as any).flushHeaders?.();

  const send = (payload: any) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send({ type: "connected", at: new Date().toISOString() });

  // Presence: mark user online while SSE is connected
  setOnline(user.id, role);

  const unsubscribe = onAppointmentEvent((evt) => {
    // Filter events to only what's relevant for this connected user.
    if (role === "PATIENT") {
      if (evt.patientUserId !== user.id) return;
    } else if (role === "DOCTOR") {
      if (evt.doctorUserId !== user.id) return;
    } else if (role === "RECEPTIONIST" || role === "HOSPITAL" || role === "NURSE") {
      if (!hospitalId || evt.hospitalId !== hospitalId) return;
    } else {
      return;
    }

    send(evt);
  });

  // Send periodic keep-alive to prevent connection timeout; also refresh presence
  const keepAliveInterval = setInterval(() => {
    if (!res.headersSent) {
      try {
        heartbeat(user.id);
        res.write(': keep-alive\n\n');
      } catch (e) {
        clearInterval(keepAliveInterval);
        unsubscribe();
      }
    }
  }, 30000); // Every 30 seconds

  const cleanup = () => {
    setOffline(user.id);
    clearInterval(keepAliveInterval);
    unsubscribe();
    if (!res.headersSent) {
      res.end();
    }
  };

  req.on("close", cleanup);
  req.on("aborted", cleanup);
});

export default router;





