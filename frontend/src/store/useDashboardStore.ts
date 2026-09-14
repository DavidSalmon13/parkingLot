import { create } from 'zustand';
import type { Lot, Spot, SpotUpdateEvent } from '../types';

interface DashboardState {
  lots: Lot[];
  highlightedSpotId: string | null;
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  applyLotSnapshot: (lots: Lot[]) => void;
  applySpotUpdate: (evt: SpotUpdateEvent) => void;
  applySpotCreated: (lotId: string, spot: Spot) => void;
  applySpotDeleted: (lotId: string, spotId: string) => void;
  applyLotCreated: (lot: Lot) => void;
  applyLotUpdated: (lot: Lot) => void;
  applyLotDeleted: (lotId: string) => void;
  setHighlightedSpotId: (id: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  lots: [],
  highlightedSpotId: null,
  wsConnected: false,
  setWsConnected: (connected) => set({ wsConnected: connected }),

  applyLotSnapshot: (lots) => set({ lots }),

  applySpotUpdate: (evt) =>
    set((state) => ({
      lots: state.lots.map((lot) =>
        lot.id !== evt.lotId
          ? lot
          : { ...lot, spots: lot.spots.map((s) => (s.id === evt.spot.id ? evt.spot : s)) },
      ),
    })),

  applySpotCreated: (lotId, spot) =>
    set((state) => ({
      lots: state.lots.map((lot) => (lot.id !== lotId ? lot : { ...lot, spots: [...lot.spots, spot] })),
    })),

  applySpotDeleted: (lotId, spotId) =>
    set((state) => ({
      lots: state.lots.map((lot) =>
        lot.id !== lotId ? lot : { ...lot, spots: lot.spots.filter((s) => s.id !== spotId) },
      ),
    })),

  applyLotCreated: (lot) =>
    set((state) => ({
      lots: state.lots.some((l) => l.id === lot.id)
        ? state.lots.map((l) => (l.id === lot.id ? lot : l))
        : [...state.lots, lot],
    })),

  applyLotUpdated: (lot) =>
    set((state) => ({
      lots: state.lots.map((l) => (l.id === lot.id ? lot : l)),
    })),

  applyLotDeleted: (lotId) =>
    set((state) => ({
      lots: state.lots.filter((l) => l.id !== lotId),
    })),

  setHighlightedSpotId: (id) => set({ highlightedSpotId: id }),
}));
