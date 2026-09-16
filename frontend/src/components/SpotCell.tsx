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
  const occupied = spot.status === 'occupied';

  useEffect(() => {
    if (!isHighlighted) return;
    const timeout = setTimeout(() => setHighlightedSpotId(null), 2000);
    return () => clearTimeout(timeout);
  }, [isHighlighted, setHighlightedSpotId]);

  return (
    <div
      id={`spot-${spot.id}`}
      className="relative flex flex-col items-center gap-1 cursor-pointer"
      onClick={() => onSelect(spot)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && <SpotTooltip lotName={lotName} spotLabel={spot.label} />}

      <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] sm:text-[10px] font-semibold tracking-wide truncate max-w-full">
        {spot.label}
      </span>

      <div
        className={[
          'relative w-full aspect-square rounded-lg border-2 flex flex-col items-center justify-center overflow-hidden p-0.5 transition-all',
          occupied
            ? 'bg-zinc-900 border-rose-600/70 shadow-[0_0_10px_-2px_theme(colors.rose.700)]'
            : 'bg-zinc-900/60 border-dashed border-zinc-700 hover:border-amber-500/60',
          isHighlighted ? 'ring-4 ring-amber-400 animate-pulse' : '',
        ].join(' ')}
      >
        {occupied && spot.car && (
          <>
            <span className="text-lg sm:text-2xl leading-none">🚗</span>
            <span
              className="mt-1 w-full px-1 rounded bg-zinc-950 border border-amber-500/40 text-amber-400 text-[11px] sm:text-sm font-mono font-bold leading-tight tracking-tight text-center truncate"
              title={spot.car.licensePlateNumber}
            >
              {spot.car.licensePlateNumber}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
