import { LotHeader } from './LotHeader';
import { SpotGrid } from './SpotGrid';
import type { Lot, Spot } from '../types';

interface LotCardProps {
  lot: Lot;
  onSelectSpot: (spot: Spot) => void;
}

export function LotCard({ lot, onSelectSpot }: LotCardProps) {
  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3">
      <LotHeader lot={lot} />
      <SpotGrid spots={lot.spots} lotName={lot.name} onSelectSpot={onSelectSpot} />
    </div>
  );
}
