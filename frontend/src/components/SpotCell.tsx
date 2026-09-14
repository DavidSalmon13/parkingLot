import { useEffect, useState } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { SpotTooltip } from './SpotTooltip';
import type { Spot } from '../types';

interface SpotCellProps {
  spot: Spot;
  lotName: string;
  onSelect: (spot: Spot) => void;
}

export function SpotCell({ spot, lotName, onSelect }: SpotCellProps) {
  const [hovered, setHovered] = useState(false);
  const highlightedSpotId = useDashboardStore((s) => s.highlightedSpotId);
  const setHighlightedSpotId = useDashboardStore((s) => s.setHighlightedSpotId);
  const isHighlighted = highlightedSpotId === spot.id;

  useEffect(() => {
    if (!isHighlighted) return;
    const timeout = setTimeout(() => setHighlightedSpotId(null), 2000);
    return () => clearTimeout(timeout);
  }, [isHighlighted, setHighlightedSpotId]);

  return (
    <div
      id={`spot-${spot.id}`}
      className={[
        'relative border-2 rounded p-2 flex flex-col items-center cursor-pointer transition-colors',
        spot.status === 'occupied' ? 'bg-red-100 border-red-500' : 'bg-green-100 border-green-500',
        isHighlighted ? 'ring-4 ring-yellow-400 animate-pulse' : '',
      ].join(' ')}
      onClick={() => onSelect(spot)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && <SpotTooltip lotName={lotName} spotLabel={spot.label} />}
      <span className="font-semibold">{spot.label}</span>
      {spot.status === 'occupied' && spot.car && <span className="text-sm text-gray-700">{spot.car.id}</span>}
    </div>
  );
}
