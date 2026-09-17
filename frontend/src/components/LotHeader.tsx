import { LotRowControls } from './LotRowControls';
import type { Lot } from '../types';

interface LotHeaderProps {
  lot: Lot;
}

export function LotHeader({ lot }: LotHeaderProps) {
  const occupied = lot.spots.filter((s) => s.status === 'occupied').length;

  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{lot.name}</h2>
      <div className="flex items-center gap-3">
        <LotRowControls lot={lot} />
        <span className="text-sm text-zinc-400 whitespace-nowrap">
          <span className="text-amber-400 font-semibold">{occupied}</span>/{lot.spots.length} תפוסים
        </span>
      </div>
    </div>
  );
}
