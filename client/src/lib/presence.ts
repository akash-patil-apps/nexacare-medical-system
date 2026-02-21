/**
 * Presence API (Slack-style online/offline).
 */

export type PresenceStatus = 'online' | 'offline';

/** GET /api/presence/users?userIds=1,2,3 → { presence: Record<userId, 'online'|'offline'> } */
export async function fetchPresenceForUserIds(
  userIds: number[],
  token: string | null
): Promise<Record<number, PresenceStatus>> {
  if (!token || userIds.length === 0) return {};
  const ids = [...new Set(userIds)].join(',');
  const res = await fetch(`/api/presence/users?userIds=${encodeURIComponent(ids)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return {};
  const data = await res.json();
  return data.presence ?? {};
}

/** GET /api/presence/doctors?hospitalId=1 → { presence: Record<doctorUserId, 'online'|'offline'> } */
export async function fetchDoctorsPresence(
  hospitalId: number | null,
  token: string | null
): Promise<Record<number, PresenceStatus>> {
  if (!token) return {};
  const url = hospitalId
    ? `/api/presence/doctors?hospitalId=${hospitalId}`
    : '/api/presence/doctors';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return {};
  const data = await res.json();
  return data.presence ?? {};
}

/** GET /api/presence → { presence: PresenceEntry[] } (hospital staff only, no patients) */
export type UserStatus = 'available' | 'away' | 'busy' | 'dnd';
export interface PresenceEntry {
  userId: number;
  role: string;
  status: string;
  lastSeen: string;
  userStatus: UserStatus;
  userStatusText: string | null;
  fullName?: string;
}
export async function fetchAllPresence(token: string | null): Promise<PresenceEntry[]> {
  if (!token) return [];
  const res = await fetch('/api/presence', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.presence ?? [];
}

/** PATCH /api/presence/me - set Slack-like status and away message (staff only) */
export async function updateMyPresence(
  token: string | null,
  payload: { userStatus?: UserStatus; userStatusText?: string | null }
): Promise<{ ok: boolean }> {
  if (!token) return { ok: false };
  const res = await fetch('/api/presence/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}
