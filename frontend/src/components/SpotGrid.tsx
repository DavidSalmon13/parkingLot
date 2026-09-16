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

  const rows = new Map<string, Spot[]>();
  for (const spot of spots) {
    const bucket = rows.get(spot.row);
    if (bucket) {
      bucket.push(spot);
    } else {
      rows.set(spot.row, [spot]);
    }
  }
  for (const bucket of rows.values()) {
    bucket.sort((a, b) => a.position - b.position);
  }

  return (
    <div className="flex flex-col gap-2">
      {[...rows.entries()].map(([row, rowSpots]) => (
        <div key={row} className="flex flex-col gap-1 max-w-full">
          <span className="text-[10px] font-semibold text-zinc-500 tracking-wide">{row}</span>
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto">
            {rowSpots.map((spot) => (
              <div key={spot.id} className="w-14 sm:w-16 shrink-0">
                <SpotCell spot={spot} lotName={lotName} onSelect={onSelectSpot} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
