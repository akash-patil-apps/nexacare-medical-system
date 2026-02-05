/**
 * Persist which notification IDs we've already shown as a toast/floating notification,
 * so we only show each notification once (not again on refresh or re-login).
 */

const STORAGE_KEY_PREFIX = 'nexacare_shown_notification_ids';
const MAX_STORED_IDS = 500;

function storageKey(userId: number | undefined): string | null {
  if (userId == null || !Number.isFinite(userId)) return null;
  return `${STORAGE_KEY_PREFIX}_${userId}`;
}

export function getShownNotificationIds(userId: number | undefined): Set<number> {
  const key = storageKey(userId);
  if (!key) return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return Array.isArray(arr) ? new Set(arr.filter((n) => typeof n === 'number')) : new Set();
  } catch {
    return new Set();
  }
}

export function markNotificationAsShown(userId: number | undefined, notificationId: number): void {
  const key = storageKey(userId);
  if (!key || typeof notificationId !== 'number' || !Number.isFinite(notificationId)) return;
  try {
    const set = getShownNotificationIds(userId);
    set.add(notificationId);
    const arr = Array.from(set);
    // Keep only the most recent IDs to avoid localStorage bloat
    const toStore = arr.length > MAX_STORED_IDS ? arr.slice(-MAX_STORED_IDS) : arr;
    localStorage.setItem(key, JSON.stringify(toStore));
  } catch {
    // ignore
  }
}
