import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import * as presenceStore from "../presence/store.js";
import { db } from "../db";
import {
  doctors,
  nurses,
  receptionists,
  pharmacists,
  radiologyTechnicians,
  hospitals,
  users,
} from "../../shared/schema";
import { eq, inArray } from "drizzle-orm";

const router = Router();

/** Get hospital ID for the current user (hospital admin, doctor, receptionist, nurse). */
async function getHospitalIdForUser(req: AuthenticatedRequest): Promise<number> {
  const user = req.user;
  if (!user) throw new Error("Not authenticated");

  const role = (user.role ?? "").toUpperCase();
  if (role === "HOSPITAL" || role === "ADMIN") {
    const [h] = await db
      .select({ id: hospitals.id })
      .from(hospitals)
      .where(eq(hospitals.userId, user.id))
      .limit(1);
    if (h) return h.id;
  }
  if (role === "RECEPTIONIST") {
    const [r] = await db
      .select({ hospitalId: receptionists.hospitalId })
      .from(receptionists)
      .where(eq(receptionists.userId, user.id))
      .limit(1);
    if (r?.hospitalId) return r.hospitalId;
  }
  if (role === "DOCTOR") {
    const [d] = await db
      .select({ hospitalId: doctors.hospitalId })
      .from(doctors)
      .where(eq(doctors.userId, user.id))
      .limit(1);
    if (d?.hospitalId) return d.hospitalId;
  }
  if (role === "NURSE") {
    const [n] = await db
      .select({ hospitalId: nurses.hospitalId })
      .from(nurses)
      .where(eq(nurses.userId, user.id))
      .limit(1);
    if (n?.hospitalId) return n.hospitalId;
  }
  if (role === "PHARMACIST") {
    const [p] = await db
      .select({ hospitalId: pharmacists.hospitalId })
      .from(pharmacists)
      .where(eq(pharmacists.userId, user.id))
      .limit(1);
    if (p?.hospitalId) return p.hospitalId;
  }
  if (role === "RADIOLOGY_TECHNICIAN" || role === "RADIOLOGY TECHNICIAN") {
    const [rt] = await db
      .select({ hospitalId: radiologyTechnicians.hospitalId })
      .from(radiologyTechnicians)
      .where(eq(radiologyTechnicians.userId, user.id))
      .limit(1);
    if (rt?.hospitalId) return rt.hospitalId;
  }
  throw new Error("Hospital ID not found for this user");
}

/** Get all staff user IDs for a hospital (doctors, nurses, receptionists, pharmacists, radiology techs). No patients. */
async function getStaffUserIdsForHospital(hospitalId: number): Promise<number[]> {
  const [doc, nur, rec, ph, rad] = await Promise.all([
    db.select({ userId: doctors.userId }).from(doctors).where(eq(doctors.hospitalId, hospitalId)),
    db.select({ userId: nurses.userId }).from(nurses).where(eq(nurses.hospitalId, hospitalId)),
    db.select({ userId: receptionists.userId }).from(receptionists).where(eq(receptionists.hospitalId, hospitalId)),
    db.select({ userId: pharmacists.userId }).from(pharmacists).where(eq(pharmacists.hospitalId, hospitalId)),
    db.select({ userId: radiologyTechnicians.userId }).from(radiologyTechnicians).where(eq(radiologyTechnicians.hospitalId, hospitalId)),
  ]);
  const ids = new Set<number>();
  for (const row of [...doc, ...nur, ...rec, ...ph, ...rad]) {
    if (row.userId != null) ids.add(row.userId);
  }
  return Array.from(ids);
}

/**
 * GET /api/presence
 * Returns only staff in the requester's hospital who are currently online.
 * For hospital admin (and staff viewing their own hospital). Never includes patients.
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("hospital", "admin", "receptionist", "nurse", "doctor", "pharmacist", "radiology_technician", "lab"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const hospitalId = await getHospitalIdForUser(req);
      const staffUserIds = await getStaffUserIdsForHospital(hospitalId);
      const presence = presenceStore.getPresenceForStaffUserIds(staffUserIds);
      if (presence.length === 0) return res.json({ presence: [] });

      const userIds = presence.map((p) => p.userId);
      const userRows = await db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(inArray(users.id, userIds));
      const nameBy = Object.fromEntries(userRows.map((r) => [r.id, r.fullName ?? ""]));

      const enriched = presence.map((p) => ({ ...p, fullName: nameBy[p.userId] ?? `User #${p.userId}` }));
      res.json({ presence: enriched });
    } catch (e: any) {
      if (e?.message === "Hospital ID not found for this user") {
        return res.status(403).json({ message: "You do not have a hospital context" });
      }
      console.error("Presence list error:", e);
      res.status(500).json({ message: "Failed to fetch presence" });
    }
  }
);

/**
 * GET /api/presence/users?userIds=1,2,3
 * Returns presence for the given user IDs. Never returns patient presence.
 */
router.get("/users", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const raw = (req.query.userIds as string) || "";
    const userIds = raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    if (userIds.length === 0) return res.json({ presence: {} });

    const presence = presenceStore.getPresenceForUserIds(userIds);
    const out: Record<number, "online" | "offline"> = {};
    for (const uid of userIds) {
      const entry = presence[uid];
      if (entry?.role?.toLowerCase() === "patient") continue; // never expose patient presence
      out[uid] = entry?.status === "online" ? "online" : "offline";
    }
    res.json({ presence: out });
  } catch (e) {
    console.error("Presence users error:", e);
    res.status(500).json({ message: "Failed to fetch presence" });
  }
});

/**
 * GET /api/presence/doctors?hospitalId=1
 * Returns doctor user IDs with online/offline only (for booking flow). No patient data.
 */
router.get("/doctors", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const hospitalId = req.query.hospitalId ? parseInt(String(req.query.hospitalId), 10) : null;
    let doctorUserIds: number[];

    if (hospitalId && !isNaN(hospitalId)) {
      const rows = await db.select({ userId: doctors.userId }).from(doctors).where(eq(doctors.hospitalId, hospitalId));
      doctorUserIds = rows.map((r) => r.userId).filter((id): id is number => id != null);
    } else {
      const rows = await db.select({ userId: doctors.userId }).from(doctors);
      doctorUserIds = rows.map((r) => r.userId).filter((id): id is number => id != null);
    }

    if (doctorUserIds.length === 0) return res.json({ presence: {} });

    const presence = presenceStore.getPresenceForUserIds(doctorUserIds);
    const out: Record<number, "online" | "offline"> = {};
    for (const uid of doctorUserIds) {
      out[uid] = presence[uid]?.status === "online" ? "online" : "offline";
    }
    res.json({ presence: out });
  } catch (e) {
    console.error("Presence doctors error:", e);
    res.status(500).json({ message: "Failed to fetch doctors presence" });
  }
});

/**
 * PATCH /api/presence/me
 * Update current user's Slack-like status and away message. Staff only (no patients).
 */
router.patch(
  "/me",
  authenticateToken,
  authorizeRoles("hospital", "admin", "receptionist", "nurse", "doctor", "pharmacist", "radiology_technician", "lab"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const body = req.body as { userStatus?: string; userStatusText?: string | null };
      const userStatus = body.userStatus as presenceStore.UserStatus | undefined;
      const allowed: presenceStore.UserStatus[] = ["available", "away", "busy", "dnd"];
      if (userStatus != null && !allowed.includes(userStatus)) {
        return res.status(400).json({ message: "Invalid userStatus; use available, away, busy, or dnd" });
      }

      presenceStore.setUserStatus(user.id, {
        userStatus,
        userStatusText: body.userStatusText ?? null,
      });
      res.json({ ok: true, userStatus: userStatus ?? null, userStatusText: body.userStatusText ?? null });
    } catch (e) {
      console.error("Presence me PATCH error:", e);
      res.status(500).json({ message: "Failed to update status" });
    }
  }
);

export default router;
