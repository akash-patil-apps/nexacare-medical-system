/**
 * In-memory presence store (Slack-style online/offline + status/away).
 * Tracks who is connected via SSE; only staff presence is exposed to hospital admin.
 * No patient presence is exposed anywhere.
 */

export type PresenceStatus = "online" | "away" | "offline";

/** Slack-style user-set status (available, away, busy, dnd) */
export type UserStatus = "available" | "away" | "busy" | "dnd";

export interface PresenceEntry {
  userId: number;
  role: string;
  status: PresenceStatus;
  lastSeen: string; // ISO
  /** User-set status (Slack-like). Default "available" when online. */
  userStatus: UserStatus;
  /** Optional custom message e.g. "In a meeting", "Back in 10 min" */
  userStatusText: string | null;
}

const store = new Map<number, PresenceEntry>();
/** Persists user-set status across disconnect/reconnect (Slack-like). */
const statusStore = new Map<number, { userStatus: UserStatus; userStatusText: string | null }>();

export function setOnline(userId: number, role: string): void {
  const saved = statusStore.get(userId);
  store.set(userId, {
    userId,
    role,
    status: "online",
    lastSeen: new Date().toISOString(),
    userStatus: saved?.userStatus ?? "available",
    userStatusText: saved?.userStatusText ?? null,
  });
}

export function setOffline(userId: number): void {
  store.delete(userId);
}

export function heartbeat(userId: number): void {
  const entry = store.get(userId);
  if (entry) {
    entry.lastSeen = new Date().toISOString();
    entry.status = "online";
  }
}

/** Update Slack-like status and away message for a user (staff only). Persists across reconnect. */
export function setUserStatus(
  userId: number,
  payload: { userStatus?: UserStatus; userStatusText?: string | null }
): void {
  const prev = statusStore.get(userId) ?? { userStatus: "available" as UserStatus, userStatusText: null };
  if (payload.userStatus !== undefined) prev.userStatus = payload.userStatus;
  if (payload.userStatusText !== undefined) prev.userStatusText = payload.userStatusText;
  statusStore.set(userId, prev);

  const entry = store.get(userId);
  if (entry) {
    entry.userStatus = prev.userStatus;
    entry.userStatusText = prev.userStatusText;
  }
}

const defaultEntry = (uid: number): PresenceEntry => ({
  userId: uid,
  role: "unknown",
  status: "offline",
  lastSeen: new Date(0).toISOString(),
  userStatus: "available",
  userStatusText: null,
});

export function getPresence(userId: number): PresenceEntry {
  const entry = store.get(userId);
  if (!entry) return defaultEntry(userId);
  return entry;
}

export function getAllPresence(): PresenceEntry[] {
  return Array.from(store.values());
}

/** Get presence only for the given user IDs (e.g. staff userIds). Never includes patients. */
export function getPresenceForUserIds(userIds: number[]): Record<number, PresenceEntry> {
  const out: Record<number, PresenceEntry> = {};
  for (const uid of userIds) {
    out[uid] = store.get(uid) ?? defaultEntry(uid);
  }
  return out;
}

/** Get presence entries only for userIds that are in the allowed set (e.g. hospital staff). */
export function getPresenceForStaffUserIds(userIds: number[]): PresenceEntry[] {
  return userIds
    .map((uid) => store.get(uid))
    .filter((e): e is PresenceEntry => e != null)
    .map((e) => ({ ...e }));
}
