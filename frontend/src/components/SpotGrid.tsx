import { SpotCell } from './SpotCell';
import type { Spot } from '../types';

interface SpotGridProps {
  spots: Spot[];
  lotName: string;
  onSelectSpot: (spot: Spot) => void;
}

export function SpotGrid({ spots, lotName, onSelectSpot }: SpotGridProps) {
  if (spots.length === 0) {
    return <p className="text-sm text-gray-500">No spots yet.</p>;
  }

  const maxPosition = Math.max(...spots.map((s) => s.position));

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${maxPosition}, minmax(60px, 1fr))`, minWidth: 'max-content' }}
      >
        {spots.map((spot) => (
          <SpotCell key={spot.id} spot={spot} lotName={lotName} onSelect={onSelectSpot} />
        ))}
      </div>
    </div>
  );
}
