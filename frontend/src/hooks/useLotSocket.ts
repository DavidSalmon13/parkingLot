import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useDashboardStore } from '../store/useDashboardStore';
import type { LotUpdateEvent } from '../types';

// Opened once for the lifetime of the app (mounted in App.tsx, which never
// unmounts across route changes) so Dashboard and Admin share one
// connection and both stay live regardless of which route is active.
export function useLotSocket() {
  const applySpotUpdate = useDashboardStore((s) => s.applySpotUpdate);
  const applySpotCreated = useDashboardStore((s) => s.applySpotCreated);
  const applySpotDeleted = useDashboardStore((s) => s.applySpotDeleted);
  const applyLotCreated = useDashboardStore((s) => s.applyLotCreated);
  const applyLotUpdated = useDashboardStore((s) => s.applyLotUpdated);
  const applyLotDeleted = useDashboardStore((s) => s.applyLotDeleted);
  const setWsConnected = useDashboardStore((s) => s.setWsConnected);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL),
      reconnectDelay: 3000,
      onConnect: () => {
        setWsConnected(true);
        client.subscribe('/topic/lot-updates', (message) => {
          const evt = JSON.parse(message.body) as LotUpdateEvent;
          switch (evt.type) {
            case 'SPOT_UPDATED':
              applySpotUpdate(evt);
              break;
            case 'SPOT_CREATED':
              applySpotCreated(evt.lotId, evt.spot);
              break;
            case 'SPOT_DELETED':
              applySpotDeleted(evt.lotId, evt.spotId);
              break;
            case 'LOT_CREATED':
              applyLotCreated(evt.lot);
              break;
            case 'LOT_UPDATED':
              applyLotUpdated(evt.lot);
              break;
            case 'LOT_DELETED':
              applyLotDeleted(evt.lotId);
              break;
          }
        });
      },
      onDisconnect: () => setWsConnected(false),
      onWebSocketClose: () => setWsConnected(false),
    });

    client.activate();
    return () => {
      client.deactivate();
      setWsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store actions are stable references from zustand
  }, []);
}
