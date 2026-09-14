import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLots } from '../api/lots';
import { useDashboardStore } from '../store/useDashboardStore';

export function useLotsQuery() {
  const applySnapshot = useDashboardStore((s) => s.applyLotSnapshot);

  // Plain 30s polling for now. §6 replaces this with a WebSocket-driven
  // toggle (disabled while connected, 30s fallback while disconnected).
  const query = useQuery({
    queryKey: ['lots'],
    queryFn: fetchLots,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (query.data) {
      applySnapshot(query.data);
    }
  }, [query.data, applySnapshot]);

  return query;
}
