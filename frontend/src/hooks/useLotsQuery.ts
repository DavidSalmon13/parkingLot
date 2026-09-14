import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLots } from '../api/lots';
import { useDashboardStore } from '../store/useDashboardStore';

export function useLotsQuery() {
  const applySnapshot = useDashboardStore((s) => s.applyLotSnapshot);
  const wsConnected = useDashboardStore((s) => s.wsConnected);

  // The WebSocket push (useLotSocket) is the primary update path once
  // connected (spec §4.3/§6.4); this refetch is purely the fallback for
  // "socket is down," so it's disabled while connected.
  const query = useQuery({
    queryKey: ['lots'],
    queryFn: fetchLots,
    refetchInterval: wsConnected ? false : 30_000,
  });

  useEffect(() => {
    if (query.data) {
      applySnapshot(query.data);
    }
  }, [query.data, applySnapshot]);

  return query;
}
