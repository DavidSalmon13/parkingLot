import type { Lot } from '../types';

interface LotHeaderProps {
  lot: Lot;
}

export function LotHeader({ lot }: LotHeaderProps) {
  const occupied = lot.spots.filter((s) => s.status === 'occupied').length;

  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-2xl font-bold">{lot.name}</h2>
      <span className="text-sm text-gray-500">
        {occupied}/{lot.spots.length} occupied
      </span>
    </div>
  );
}
