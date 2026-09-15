import { SpotCell } from './SpotCell';
import type { Spot } from '../types';

interface SpotGridProps {
  spots: Spot[];
  lotName: string;
  onSelectSpot: (spot: Spot) => void;
}

export function SpotGrid({ spots, lotName, onSelectSpot }: SpotGridProps) {
  if (spots.length === 0) {
    return <p className="text-sm text-zinc-500">אין עדיין מקומות חניה.</p>;
  }

  const maxPosition = Math.max(...spots.map((s) => s.position));

  return (
    <div
      className="grid gap-1.5 sm:gap-2"
      style={{ gridTemplateColumns: `repeat(${maxPosition}, minmax(0, 4rem))` }}
    >
      {spots.map((spot) => (
        <SpotCell key={spot.id} spot={spot} lotName={lotName} onSelect={onSelectSpot} />
      ))}
    </div>
  );
}
