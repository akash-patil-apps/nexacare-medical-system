import { useQuery } from '@tanstack/react-query';
import { fetchPresenceForUserIds, type PresenceStatus } from '../lib/presence';

/**
 * Fetches presence for the given user IDs (e.g. doctor userIds).
 * Refetches every 45s so the list stays roughly in sync without hammering the server.
 */
export function useDoctorsPresence(doctorUserIds: number[] | null) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
  const ids = doctorUserIds && doctorUserIds.length > 0 ? doctorUserIds : [];

  const { data: presence = {} } = useQuery({
    queryKey: ['presence', 'users', ids.sort().join(',')],
    queryFn: () => fetchPresenceForUserIds(ids, token),
    enabled: ids.length > 0 && !!token,
    refetchInterval: 45_000,
    staleTime: 30_000,
  });

  return presence as Record<number, PresenceStatus>;
}
