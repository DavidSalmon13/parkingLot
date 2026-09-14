import { create } from 'zustand';
import type { Lot, Spot, SpotUpdateEvent } from '../types';

interface DashboardState {
  lots: Lot[];
  highlightedSpotId: string | null;
  applyLotSnapshot: (lots: Lot[]) => void;
  applySpotUpdate: (evt: SpotUpdateEvent) => void;
  applySpotCreated: (lotId: string, spot: Spot) => void;
  applySpotDeleted: (lotId: string, spotId: string) => void;
  setHighlightedSpotId: (id: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  lots: [],
  highlightedSpotId: null,

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

  setHighlightedSpotId: (id) => set({ highlightedSpotId: id }),
}));
