import { useQuery } from '@tanstack/react-query';
import { fetchAllPresence, type PresenceEntry } from '../lib/presence';

/**
 * Fetches all online users (admin/hospital). Refetches every 30s.
 */
export function useAllPresence(enabled: boolean = true) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
  const { data: presence = [] } = useQuery({
    queryKey: ['presence', 'all'],
    queryFn: () => fetchAllPresence(token),
    enabled: enabled && !!token,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  return presence as PresenceEntry[];
}
