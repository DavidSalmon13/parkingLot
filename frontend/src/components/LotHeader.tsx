import type { Lot } from '../types';

interface LotHeaderProps {
  lot: Lot;
}

export function LotHeader({ lot }: LotHeaderProps) {
  const occupied = lot.spots.filter((s) => s.status === 'occupied').length;

  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{lot.name}</h2>
      <span className="text-sm text-zinc-400">
        <span className="text-amber-400 font-semibold">{occupied}</span>/{lot.spots.length} תפוסים
      </span>
    </div>
  );
}
